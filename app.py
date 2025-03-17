from flask import Flask, render_template
from flask_socketio import SocketIO
import eventlet
eventlet.monkey_patch()  # Parchear para compatibilidad con WebSockets y Flask-SocketIO
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from mqtt_client import init_mqtt, latest_data
import time
import threading

# Inicializar Flask y SocketIO
app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins="*")


# Iniciar clientes MQTT
mqtt_clients = init_mqtt(socketio)

def emit_data():
    """ Enviar datos en tiempo real cada 5 segundos """
    while True:
        print("📡 Enviando datos al frontend:", latest_data)  # Verifica qué se está enviando
        socketio.emit('update_values', latest_data)
        eventlet.sleep(60) # Espera X segundos

# Iniciar el hilo para actualizar los datos en tiempo real
eventlet.spawn(emit_data)  # Usar eventlet en lugar de threading
# # Iniciar el hilo para actualizar los datos en tiempo real
# threading.Thread(target=emit_data, daemon=True).start()

@app.route('/')
def index():
    """ Renderiza la página principal """
    return render_template('index.html')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8080)