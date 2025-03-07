import paho.mqtt.client as mqtt
import json

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

def on_connect(client, userdata, flags, rc):
    """ Callback cuando el cliente se conecta al broker. """
    if rc == 0:
        topic = userdata["MQTT_TOPIC"]
        print(f"✅ Conectado a {userdata['BROKER_HOST']} - Suscrito a: {topic}")
        client.subscribe(topic)
    else:
        print(f"⚠️ Error en la conexión al broker {userdata['BROKER_HOST']}. Código: {rc}")

def on_message(client, userdata, msg):
    """ Callback cuando se recibe un mensaje en cualquier topic suscrito. """
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)  # Intentar parsear como JSON
        print(f"\n📥 [{msg.topic}] Nuevo mensaje recibido:")
        print(json.dumps(data, indent=4))  # Imprimir JSON formateado
    except json.JSONDecodeError:
        print(f"\n⚠️ [{msg.topic}] Mensaje recibido (No es JSON válido):")
        print(payload)

# Lista para almacenar los clientes MQTT
clients = []

for config in MQTT_CONFIGS:
    client = mqtt.Client()
    client.username_pw_set(config["CLIENT_NAME"], config["CLIENT_PASS"])
    client.on_connect = on_connect
    client.on_message = on_message
    client.user_data_set(config)  # Pasar datos del broker a los callbacks

    # Configurar TLS si el puerto es 8883 (seguro)
    if config["BROKER_PORT"] == 8883:
        client.tls_set()

    client.connect(config["BROKER_HOST"], config["BROKER_PORT"], 60)
    client.loop_start()  # Iniciar en segundo plano
    clients.append(client)

# Mantener el script en ejecución para recibir mensajes
try:
    while True:
        pass
except KeyboardInterrupt:
    print("\n🔴 Cerrando conexiones MQTT...")
    for client in clients:
        client.loop_stop()
        client.disconnect()



###################################################################
# import paho.mqtt.client as mqtt

# # BROKER_HOST = "138.91.106.85"
# # BROKER_PORT = 1885
# # TOPICS = [("Flotation", 0)] # ,("Flotation_Predicted", 0)] 
# # CLIENT_NAME = "usermqtt"
# # CLIENT_PASS = "usermqtt"

# BROKER_HOST = "cdf78d62f40d4d9cbc43ba31af296c41.s1.eu.hivemq.cloud"
# BROKER_PORT = 8883
# MQTT_TOPIC = "Flotation"
# CLIENT_NAME = "vertix"
# CLIENT_PASS = "Vertix123$"

# def on_connect(client, userdata, flags, rc):
#     if rc == 0:
#         print("✅ Conectado al broker MQTT")
#         client.subscribe(TOPICS)
#     else:
#         print(f"⚠️ Error en la conexión MQTT. Código: {rc}")

# def on_message(client, userdata, msg):
#     print(f"📥 [{msg.topic}] Mensaje recibido: {msg.payload.decode('utf-8')}")

# client = mqtt.Client()
# client.username_pw_set(CLIENT_NAME, CLIENT_PASS)
# client.on_connect = on_connect
# client.on_message = on_message

# client.connect(BROKER_HOST, BROKER_PORT, 60)
# client.loop_forever()  # Mantener la conexión abierta
