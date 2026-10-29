// Native CoreBluetooth bridge for the Electron build.
//
// Chromium's Web Bluetooth only sees keyboards that are advertising. A
// keyboard already connected to this Mac stops advertising, so it never shows
// up. CoreBluetooth can still hand us a peripheral the system is connected to
// (retrieveConnectedPeripherals), which lets Studio talk over the same
// Bluetooth profile the keyboard is typing on.
//
// Protocol: one JSON object per line on stdin (commands) and stdout (events).
//   in : {"cmd":"list"} | {"cmd":"connect","id":"<uuid>"} |
//        {"cmd":"write","data":"<base64>"} | {"cmd":"disconnect"}
//   out: {"event":"devices","devices":[{"id","name","connected"}]} |
//        {"event":"connected","name"} | {"event":"data","data":"<base64>"} |
//        {"event":"disconnected"} | {"event":"error","message"}

import CoreBluetooth
import Foundation

let studioService = CBUUID(string: "00000000-0196-6107-c967-c5cfb1c2482a")
let rpcCharacteristic = CBUUID(string: "00000001-0196-6107-c967-c5cfb1c2482a")
let hidService = CBUUID(string: "1812")
let batteryService = CBUUID(string: "180F")
let scanSeconds = 2.5

func emit(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object),
        var line = String(data: data, encoding: .utf8)
    else { return }
    line += "\n"
    FileHandle.standardOutput.write(line.data(using: .utf8)!)
}

final class Bridge: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var central: CBCentralManager!
    private var peripherals: [UUID: CBPeripheral] = [:]
    private var advertising = Set<UUID>()
    private var active: CBPeripheral?
    private var rpc: CBCharacteristic?
    private var pendingWrites: [Data] = []
    private var queuedCommands: [[String: Any]] = []

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }

    func handle(_ command: [String: Any]) {
        guard central.state == .poweredOn else {
            queuedCommands.append(command)
            return
        }
        switch command["cmd"] as? String {
        case "list": list()
        case "connect": connect(command["id"] as? String ?? "")
        case "write": write(command["data"] as? String ?? "")
        case "disconnect": disconnect()
        default: emit(["event": "error", "message": "unknown command"])
        }
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            let queued = queuedCommands
            queuedCommands = []
            queued.forEach(handle)
        case .unauthorized:
            emit(["event": "error", "message": "Bluetooth access is denied for this app. Allow it in System Settings > Privacy & Security > Bluetooth."])
        case .poweredOff:
            emit(["event": "error", "message": "Bluetooth is turned off."])
        default:
            break
        }
    }

    // MARK: listing

    private func list() {
        advertising.removeAll()
        let connected = central.retrieveConnectedPeripherals(
            withServices: [studioService, hidService, batteryService])
        for p in connected { peripherals[p.identifier] = p }
        let connectedIds = Set(connected.map { $0.identifier })
        central.scanForPeripherals(withServices: [studioService, batteryService])
        DispatchQueue.main.asyncAfter(deadline: .now() + scanSeconds) { [self] in
            central.stopScan()
            let all = Set(connectedIds).union(advertising)
            let devices: [[String: Any]] = all.compactMap { id in
                guard let p = peripherals[id] else { return nil }
                return [
                    "id": id.uuidString,
                    "name": p.name ?? "Unknown",
                    "connected": connectedIds.contains(id),
                ]
            }
            emit(["event": "devices", "devices": devices])
        }
    }

    func centralManager(
        _ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any], rssi RSSI: NSNumber
    ) {
        peripherals[peripheral.identifier] = peripheral
        advertising.insert(peripheral.identifier)
    }

    // MARK: connecting

    private func connect(_ id: String) {
        guard let uuid = UUID(uuidString: id), let p = peripherals[uuid] else {
            emit(["event": "error", "message": "device not found"])
            return
        }
        active = p
        p.delegate = self
        central.connect(p)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices([studioService])
    }

    func centralManager(
        _ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?
    ) {
        emit(["event": "error", "message": "connect failed: \(error?.localizedDescription ?? "unknown")"])
    }

    func centralManager(
        _ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?
    ) {
        guard peripheral === active else { return }
        active = nil
        rpc = nil
        pendingWrites.removeAll()
        emit(["event": "disconnected"])
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let service = peripheral.services?.first(where: { $0.uuid == studioService }) else {
            emit(["event": "error", "message": "This keyboard does not expose the ZMK Studio service. Its firmware may not have Studio enabled."])
            return
        }
        peripheral.discoverCharacteristics([rpcCharacteristic], for: service)
    }

    func peripheral(
        _ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?
    ) {
        guard let c = service.characteristics?.first(where: { $0.uuid == rpcCharacteristic }) else {
            emit(["event": "error", "message": "Studio RPC characteristic not found."])
            return
        }
        rpc = c
        peripheral.setNotifyValue(true, for: c)
    }

    func peripheral(
        _ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        if let error = error {
            emit(["event": "error", "message": "subscribe failed: \(error.localizedDescription)"])
            return
        }
        if characteristic.isNotifying {
            emit(["event": "connected", "name": peripheral.name ?? "Unknown"])
        }
    }

    func peripheral(
        _ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?
    ) {
        guard characteristic.uuid == rpcCharacteristic, let value = characteristic.value else { return }
        emit(["event": "data", "data": value.base64EncodedString()])
    }

    // MARK: writing

    private func write(_ base64: String) {
        guard let data = Data(base64Encoded: base64) else { return }
        pendingWrites.append(data)
        drain()
    }

    private func drain() {
        guard let p = active, let c = rpc else { return }
        let noResponse = c.properties.contains(.writeWithoutResponse)
        let type: CBCharacteristicWriteType = noResponse ? .withoutResponse : .withResponse
        let chunk = max(20, p.maximumWriteValueLength(for: type))
        while !pendingWrites.isEmpty {
            if noResponse && !p.canSendWriteWithoutResponse { return }
            var head = pendingWrites[0]
            let piece = head.prefix(chunk)
            head.removeFirst(piece.count)
            if head.isEmpty { pendingWrites.removeFirst() } else { pendingWrites[0] = head }
            p.writeValue(Data(piece), for: c, type: type)
            if !noResponse { return }  // wait for didWriteValueFor
        }
    }

    func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) { drain() }

    func peripheral(
        _ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?
    ) {
        if let error = error {
            emit(["event": "error", "message": "write failed: \(error.localizedDescription)"])
        }
        drain()
    }

    private func disconnect() {
        if let p = active { central.cancelPeripheralConnection(p) }
    }
}

let bridge = Bridge()

DispatchQueue.global().async {
    while let line = readLine() {
        guard let data = line.data(using: .utf8),
            let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { continue }
        DispatchQueue.main.async { bridge.handle(obj) }
    }
    exit(0)  // stdin closed: the app went away
}

RunLoop.main.run()
