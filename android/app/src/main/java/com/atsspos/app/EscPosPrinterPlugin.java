package com.atsspos.app;

import android.content.Context;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.DeviceConnection;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothConnection;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothPrintersConnections;
import com.dantsu.escposprinter.connection.tcp.TcpConnection;
import com.dantsu.escposprinter.connection.usb.UsbPrintersConnections;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Thin bridge to DantSu's ESCPOS-ThermalPrinter-Android library, used
 * directly rather than through a third-party Cordova/Capacitor wrapper so
 * this project owns the (small) native surface. Every call connects,
 * prints, and disconnects -- no connection is kept open between calls,
 * which keeps the plugin simple and avoids stale-connection bugs across a
 * long POS shift.
 */
@CapacitorPlugin(name = "EscPosPrinter")
public class EscPosPrinterPlugin extends Plugin {

    @PluginMethod
    public void printReceipt(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("Missing 'text'");
            return;
        }

        String connectionType = call.getString("connectionType", "bluetooth");
        int dpi = call.getInt("dpi", 203);
        float widthMm = call.getDouble("widthMm", 48.0).floatValue();
        int charsPerLine = call.getInt("charsPerLine", 32);
        boolean openDrawer = Boolean.TRUE.equals(call.getBoolean("openDrawer", false));
        String address = call.getString("address");
        int port = call.getInt("port", 9100);

        new Thread(() -> {
            EscPosPrinter printer = null;
            try {
                DeviceConnection connection = resolveConnection(connectionType, address, port);
                if (connection == null) {
                    call.reject("No printer found for connectionType='" + connectionType + "'");
                    return;
                }

                printer = new EscPosPrinter(connection, dpi, widthMm, charsPerLine);
                if (openDrawer) {
                    printer.printFormattedTextAndOpenCashBox(text, 20f);
                } else {
                    printer.printFormattedTextAndCut(text);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Print failed: " + e.getMessage(), e);
            } finally {
                if (printer != null) {
                    printer.disconnectPrinter();
                }
            }
        }).start();
    }

    @PluginMethod
    public void listPairedBluetoothPrinters(PluginCall call) {
        JSArray result = new JSArray();
        BluetoothConnection[] devices = new BluetoothPrintersConnections().getList();
        if (devices != null) {
            for (BluetoothConnection device : devices) {
                JSObject item = new JSObject();
                item.put("name", device.getDevice().getName());
                item.put("address", device.getDevice().getAddress());
                result.put(item);
            }
        }
        JSObject ret = new JSObject();
        ret.put("printers", result);
        call.resolve(ret);
    }

    private DeviceConnection resolveConnection(String connectionType, String address, int port) {
        switch (connectionType) {
            case "tcp": {
                if (address == null) return null;
                return new TcpConnection(address, port, 15);
            }
            case "usb": {
                Context context = getContext();
                return UsbPrintersConnections.selectFirstConnected(context);
            }
            case "bluetooth":
            default: {
                if (address == null) {
                    return BluetoothPrintersConnections.selectFirstPaired();
                }
                BluetoothConnection[] devices = new BluetoothPrintersConnections().getList();
                if (devices == null) return null;
                for (BluetoothConnection device : devices) {
                    if (address.equals(device.getDevice().getAddress())) {
                        return device;
                    }
                }
                return null;
            }
        }
    }
}
