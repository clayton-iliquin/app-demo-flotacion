import paho.mqtt.client as mqtt
import json
from flask_socketio import SocketIO

# Configuración de los dos brokers MQTT
MQTT_CONFIGS = [
    {
        "BROKER_HOST": "138.91.106.85",
        "BROKER_PORT": 1885,
        "MQTT_TOPIC": "Flotation_Predicted",
        "CLIENT_NAME": "usermqtt",
        "CLIENT_PASS": "usermqtt"
    },
    {
        "BROKER_HOST": "cdf78d62f40d4d9cbc43ba31af296c41.s1.eu.hivemq.cloud",
        "BROKER_PORT": 8883,
        "MQTT_TOPIC": "Flotation",
        "CLIENT_NAME": "vertix",
        "CLIENT_PASS": "Vertix123$"
    }
]

# Inicializar SocketIO
socketio: SocketIO = None

# Diccionario para almacenar los últimos datos recibidos de cada topic
latest_data: dict = {}

def on_connect(client: mqtt.Client, userdata, flags, rc: int) -> None:
    """ Callback cuando el cliente se conecta al broker. """
    if rc == 0:
        topic = userdata["MQTT_TOPIC"]
        print(f"✅ Conectado al broker {userdata['BROKER_HOST']} - Suscrito a: {topic}")
        client.subscribe(topic)
    else:
        print(f"⚠️ Error en la conexión MQTT al broker {userdata['BROKER_HOST']}. Código: {rc}")

def on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage) -> None:
    """ Callback cuando se recibe un mensaje en cualquier topic suscrito. """
    global latest_data
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)  # Intentar parsear como JSON
        
        # Verificar si el mensaje contiene una estructura esperada
        if "data" in data:
            processed_data = {}

            # Extraer los valores clave
            for item in data["data"]:
                tag_name = item["tagName"]
                if "values" in item and len(item["values"]) > 0:
                    processed_data[tag_name] = item["values"][0]["value"]  # Obtener el último valor disponible

            latest_data[msg.topic] = processed_data  # Guardar datos limpios
            print(f"📥 [{msg.topic}] Datos procesados:", processed_data)

            # Emitir los datos al frontend en tiempo real
            if socketio:
                socketio.emit("update_values", {msg.topic: processed_data})
        else:
            print(f"⚠️ [{msg.topic}] Formato de datos inesperado:", data)

    except json.JSONDecodeError:
        print(f"❌ [{msg.topic}] Error: Mensaje recibido no es JSON válido - {payload}")


def init_mqtt(socketio_instance: SocketIO) -> list:
    """ Inicializa y configura los clientes MQTT para cada fuente de datos. """
    global socketio
    socketio = socketio_instance

    clients = []
    for config in MQTT_CONFIGS:
        client = mqtt.Client()
        client.username_pw_set(config["CLIENT_NAME"], config["CLIENT_PASS"])
        client.on_connect = on_connect
        client.on_message = on_message
        client.user_data_set(config)  # Pasar datos del broker a los callbacks

        # Conectar usando el protocolo adecuado (MQTT seguro o no seguro)
        if config["BROKER_PORT"] == 8883:
            client.tls_set()  # Requerido para conexiones seguras en puertos 8883

        client.connect(config["BROKER_HOST"], config["BROKER_PORT"], 60)
        client.loop_start()  # Iniciar el loop en segundo plano
        clients.append(client)

    return clients
