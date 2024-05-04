import { useEffect, useState } from "react";

import { ESPLoader, FlashOptions, LoaderOptions, Transport } from "esptool-js";
import { Terminal } from "@xterm/xterm";

import mqtt, { MqttProtocol } from "mqtt";

function App() {
  const [term] = useState(new Terminal());
  const [term2] = useState(new Terminal());
  const [transport, setTransport] = useState<Transport>();
  const [espLoader, setEspLoader] = useState<ESPLoader>();

  const [mqttPublish, setMqttPublish] = useState<{
    topic: string;
    message: string;
  }>({
    topic: "test-topic",
    message: "this is a test message",
  });

  const [flashProgressPercentage, setFlashProgressPercentage] =
    useState<number>(0);

  const [binToFlash, setBinToFlash] = useState<string>(
    "http://localhost:5173/simple_print_test.ino.bin"
  );

  let isConsoleOpen = false;

  const [mqttOptions, setMqttOptions] = useState<mqtt.IClientOptions>({
    protocol: "ws",
    hostname: "smartfarmingunpad.com",
    port: 8884,
    // clientId: "fsh-web-mqtt-tool",
  });

  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient>();

  const [serialSend, setSerialSend] = useState<string>();

  useEffect(() => {
    const x = document.getElementById("terminal");
    if (x) {
      term.open(x);
      term.writeln("Welcome to friansh ESP UPLOAD TOOL!");
    }

    const y = document.getElementById("terminal-mqtt");
    if (y) {
      term2.open(y);
      term2.writeln("Welcome to friansh MQTT!");
    }

    term2.reset();
  }, []);

  useEffect(() => {
    if (mqttClient == undefined) return;

    term2.writeln(
      `Connecting to: ${mqttOptions.protocol}://${mqttOptions.hostname}:${mqttOptions.port} with username: ${mqttOptions.username} and password: ${mqttOptions.password}`
    );

    mqttClient.on("connect", () => {
      term2.writeln("SYS-INFO: Connected to mqtt server via websocket");
      mqttClient.subscribe("#", (err) => {
        if (!err) {
          term2.writeln("SYS-INFO: Subscribed to topic successfully");
        }
      });
    });

    mqttClient.on("message", (topic, message) => {
      term2.writeln(`${topic}: ${message.toString()}`);
    });

    mqttClient.on("close", () => {
      term2.writeln("SYS-ERROR: CONNECTION CLOSED");
      term2.writeln(JSON.stringify(mqttOptions));
      term2.writeln("");
    });
  }, [mqttClient]);

  useEffect(() => {
    if (transport) {
      try {
        const flashOptions = {
          transport,
          baudrate: 115200,
          terminal: espLoaderTerminal,
        } as LoaderOptions;
        setEspLoader(new ESPLoader(flashOptions));

        // Temporarily broken
        // await esploader.flashId();
      } catch (e: any) {
        console.error(e);
        term.writeln(`Error: ${e.message}`);
      }
    }
  }, [transport]);

  const espLoaderTerminal = {
    clean() {
      term.clear();
    },
    writeLine(data: string | Uint8Array) {
      term.writeln(data);
    },
    write(data: string | Uint8Array) {
      term.write(data);
    },
  };

  const handleSetDevice = async () => {
    const device = await navigator.serial.requestPort();
    setTransport(new Transport(device, false));
  };

  const handleTerminalConnect = async () => {
    if (!transport) return alert("Device belum dipilih!");

    await transport.connect(115200);
    isConsoleOpen = true;

    while (isConsoleOpen) {
      const val = await transport.rawRead();
      if (typeof val !== "undefined") {
        term.write(val);
      } else {
        break;
      }
    }
  };

  const handleTerminalDisconnect = async () => {
    if (!isConsoleOpen) return alert("Console belum berjalan!");

    isConsoleOpen = false;

    if (transport) {
      await transport.disconnect();
      await transport.waitForUnlock(1500);
    }

    term.reset();
    setTransport(undefined);
  };

  const handleFlash = async () => {
    if (espLoader == undefined) return;

    fetch(binToFlash)
      .then((val) => {
        return val.blob();
      })
      .then((fileBlob) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const binaryString = reader.result;

          const fileArray = [];
          fileArray.push({ data: binaryString, address: 0 });

          await espLoader.main();

          try {
            const flashOptions: FlashOptions = {
              fileArray: fileArray,
              flashSize: "keep",
              eraseAll: false,
              compress: true,
              reportProgress: (fileIndex, written, total) => {
                // console.log(`file ${fileIndex} = ${}`);
                setFlashProgressPercentage((written / total) * 100);
                if (written / total == 1)
                  alert(
                    "Jika flash sudah selesai, silahkan refresh halaman, pilih device, klik terminal connect, lalu hard reset."
                  );
              },
            } as FlashOptions;
            await espLoader.writeFlash(flashOptions);
          } catch (e: any) {
            console.error(e);
            term.writeln(`Error: ${e.message}`);
          }
        };
        reader.readAsBinaryString(fileBlob);
      });
  };

  const handleHardReset = () => {
    if (espLoader) {
      espLoader.hardReset();
    }
  };

  const handleMqttPublish = () => {
    if (mqttClient == undefined) return alert("MQTT IS NOT CONNECTED!");
    mqttClient.publish(mqttPublish.topic, mqttPublish.message);
  };

  const handleSendSerial = () => {
    if (!transport) return;
    const enc = new TextEncoder();
    const encodedMessage = enc.encode(serialSend + "\n");

    transport.write(encodedMessage);
  };

  return (
    <>
      <header className="my-5">
        <h1 className="text-3xl text-center text-white font-bold">
          friansh IoT Tool
        </h1>
        <h2 className="text-xl text-center text-white font-semibold mt-3">
          Dibuat Untuk Iseng Iseng Sadja. Memudahkan karena tools yang udah udah
          banyak n riweuh.
        </h2>
        <h3 className="text-md text-center text-white font-medium mt-3">
          Hanya Support Browser Google Chrome dan Microsoft Edge PC/Laptop
          terbaru.
        </h3>
      </header>

      <main className="px-4 mt-5 mb-10 flex xl:flex-row flex-col gap-10">
        <section className="basis-1/2 p-5 border-solid border border-[#627254] rounded-lg bg-[#76885b]">
          <h2 className="text-2xl font-semibold text-center text-white">
            Serial Monitor & Flasher
          </h2>
          <h3 className="text-sm text-center text-white mt-2">
            Pastikan Driver Sudah Diinstall. Nama Device Biasanya "USB 2.0
            Serial" atau "CH340" atau "FT232RL" atau "CP2102". Hindari klik
            port-port aneh seperti "Communication Port" atau "Bluetooth
            Peripheral". Pastikan baud rate pada 115200.
          </h3>

          <div className="mt-4">
            <button
              className="bg-[#eeeeee] hover:bg-[#dddddd] border-solid border border-[#dddddd] rounded-md text-black px-4 py-3 drop-shadow-lg"
              onClick={handleSetDevice}
            >
              Select Device
            </button>

            {transport && (
              <div className="mt-2 shadow-lg bg-[#dddddd] p-5 border border-solid border-[#627254] rounded-2xl">
                <span>Device Selected! Waiting for action/connect...</span>
              </div>
            )}
          </div>

          <div id="terminal" className="block mt-4 shadow-xl"></div>

          <div className="mt-4 flex flex-row gap-4">
            <div className="basis-3/4">
              <button
                className="bg-[#eeeeee] hover:bg-[#dddddd] border-solid border border-[#dddddd] rounded-md text-black px-4 py-3 drop-shadow-lg"
                onClick={handleTerminalConnect}
                // disabled={true}
              >
                Console Connect
              </button>
              <button
                onClick={handleTerminalDisconnect}
                className="ms-2 bg-[#eeeeee] hover:bg-[#dddddd] border-solid border border-[#dddddd] rounded-md text-black px-4 py-3 drop-shadow-lg"
              >
                Console Disconnect
              </button>
              <button
                onClick={handleHardReset}
                className="ms-2 bg-[#eeeeee] hover:bg-[#dddddd] border-solid border border-[#dddddd] rounded-md text-black px-4 py-3 drop-shadow-lg"
              >
                Hard Reset
              </button>

              <div className="mt-3 block p-4 border-solid border border-[#627254] rounded-lg">
                <label className="block text-white ms-1 mb-1 font-medium">
                  Send Message to Device : (ended by /r/n)
                </label>
                <textarea
                  className="rounded px-2 py-1 text-sm w-full"
                  rows={3}
                  value={serialSend}
                  onChange={(e) => setSerialSend(e.target.value)}
                />
                <button
                  onClick={handleSendSerial}
                  className="block ms-auto mt-3 bg-[#eeeeee] hover:bg-[#dddddd] border-solid border border-[#dddddd] rounded-md text-black px-4 py-1 drop-shadow-lg text-sm"
                >
                  Send via Serial
                </button>
              </div>
            </div>
            <div className="basis-1/2 p-4 border-solid border border-[#627254] rounded-lg">
              <h4 className="text-center text-white font-semibold text-lg">
                Firmware Flash Tool
              </h4>
              <h4 className="text-center text-white text-sm">
                Flash Tidak Akan Berjalan Jika Console Masih Terhubung, Silahkan
                Disconnect Terlebih Dahulu
              </h4>
              <div className="mt-2">
                <div className="basis-1/4">
                  <label className="block text-white ms-1 mb-1 font-medium">
                    Bin Url :
                  </label>
                  <input
                    className="rounded px-2 py-1 text-sm w-full"
                    type="text"
                    value={binToFlash}
                    onChange={(e) => setBinToFlash(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-row mt-3 gap-4">
                <button
                  onClick={handleFlash}
                  className="basis-1/2 bg-[#eeeeee] hover:bg-[#dddddd] border-solid border border-[#dddddd] rounded-md text-black px-4 py-3 drop-shadow-lg"
                >
                  Flash!
                </button>
                <div className="basis-1/2">
                  <span className="block text-center text-white text-sm">
                    Flashing Progress:
                  </span>
                  <div className="progress-bar mt-2">
                    <div
                      className="bar"
                      style={{ width: `${flashProgressPercentage}%` }}
                    >
                      <span>{flashProgressPercentage.toFixed()}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex">
            <span className="basis m-auto text-center text-white rounded-xl border-solid border border-[#627254] text-sm px-10 py-3">
              jika error, klik hard reset atau refresh halaman
            </span>
          </div>
        </section>

        <section className="basis-1/2 p-5 border-solid border border-[#627254] rounded-lg bg-[#76885b]">
          <h2 className="text-2xl font-semibold text-center text-white">
            MQTT Console
          </h2>
          <h3 className="text-sm text-center text-white mt-2">
            Terminal di bawah menunjukkan aktivitas data MQTT dari semua topik.
            Setiap pesan terdiri dari format `[topik]: [isi pesan]`.
          </h3>

          <div>
            <div className="flex flex-row gap-3 mt-3">
              <div className="basis-1/5">
                <label
                  className="block text-white ms-1 mb-1 font-medium"
                  htmlFor="mqtt-protocol"
                >
                  Protocol:
                </label>
                <select
                  id="mqtt-protocol"
                  className="rounded px-2 py-1 text-sm w-full"
                  value={mqttOptions.protocol}
                  onChange={(e) =>
                    setMqttOptions({
                      ...mqttOptions,
                      protocol: e.target.value as MqttProtocol,
                    })
                  }
                >
                  <option value="ws">WebSocket (ws)</option>
                  <option value="wss">Secured WebSocket (wss)</option>
                </select>
              </div>
              <div className="basis-1/5">
                <label className="block text-white ms-1 mb-1 font-medium">
                  Hostname:
                </label>
                <input
                  className="rounded px-2 py-1 text-sm w-full"
                  type="text"
                  value={mqttOptions.hostname}
                  onChange={(e) =>
                    setMqttOptions({ ...mqttOptions, hostname: e.target.value })
                  }
                />
              </div>
              <div className="basis-1/5">
                <label className="block text-white ms-1 mb-1 font-medium">
                  Port:
                </label>
                <input
                  className="rounded px-2 py-1 text-sm w-full"
                  type="number"
                  value={mqttOptions.port}
                  onChange={(e) =>
                    setMqttOptions({
                      ...mqttOptions,
                      port: e.target.valueAsNumber,
                    })
                  }
                />
              </div>
              <div className="basis-1/5">
                <label className="block text-white ms-1 mb-1 font-medium">
                  Username:
                </label>
                <input
                  className="rounded px-2 py-1 text-sm w-full"
                  type="text"
                  value="default"
                />
              </div>
              <div className="basis-1/5">
                <label className="block text-white ms-1 mb-1 font-medium">
                  Password:
                </label>
                <input
                  className="rounded px-2 py-1 text-sm w-full"
                  type="text"
                  value="default"
                />
              </div>
            </div>
            <div className="flex flex-row-reverse gap-3 mt-5">
              <div className="basis">
                <button
                  className="basis-1/4 bg-[#eeeeee] border-solid border border-[#dddddd] rounded-md text-black px-4 py-1 text-sm drop-shadow-lg"
                  onClick={() => term2.reset()}
                >
                  Clear Console
                </button>
              </div>
              <div className="basis">
                <button
                  className="basis-1/4 bg-[#eeeeee] border-solid border border-[#dddddd] rounded-md text-black px-4 py-1 text-sm drop-shadow-lg"
                  onClick={() => {
                    setMqttClient(mqtt.connect(mqttOptions));
                  }}
                >
                  Connect
                </button>
              </div>
            </div>
          </div>

          <div id="terminal-mqtt" className="block mt-4 shadow-xl"></div>

          <div className="mt-4 border-solid border border-[#627254] rounded-lg p-4">
            <h4 className="text-center text-white text-lg font-bold">
              Kirim/Publish pesan MQTT manual
            </h4>

            <div className="flex flex-row gap-3 mt-2">
              <div className="basis-1/3">
                <label
                  htmlFor="mqtt-public-topic"
                  className="block text-white ms-1 mb-1 font-medium"
                >
                  Topic:
                </label>
                <input
                  id="mqtt-public-topic"
                  className="rounded px-2 py-1 text-sm w-full"
                  type="text"
                  value={mqttPublish.topic}
                  onChange={(e) =>
                    setMqttPublish({ ...mqttPublish, topic: e.target.value })
                  }
                />
              </div>
              <div className="basis-2/3">
                <label
                  htmlFor="mqtt-public-value"
                  className="block text-white ms-1 mb-1 font-medium"
                >
                  Value:
                </label>
                <input
                  id="mqtt-public-value"
                  className="rounded px-2 py-1 text-sm w-full"
                  type="text"
                  value={mqttPublish.message}
                  onChange={(e) =>
                    setMqttPublish({ ...mqttPublish, message: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex flex-row gap-3 mt-5">
              <button
                className="basis ms-auto bg-[#eeeeee] border-solid border border-[#dddddd] rounded-md text-black px-4 py-1 text-sm drop-shadow-lg"
                onClick={handleMqttPublish}
              >
                Publish Pesan
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="p-6 bg-[#627254] mt-auto">
        <span className="text-white text-center block">
          Copyright &copy; Fikri Rida Pebriansyah, S.T. 2024
        </span>
      </footer>
    </>
  );
}

export default App;
