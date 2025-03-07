from flask import Flask, render_template
from flask_socketio import SocketIO
import eventlet
from app_demo_flotacion.mqtt_client import init_mqtt, latest_data
import time
import threading

# Inicializar Flask y SocketIO
app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet')

# Iniciar clientes MQTT
mqtt_clients = init_mqtt(socketio)

def emit_data():
    """ Enviar datos en tiempo real cada 5 segundos """
    while True:
        socketio.emit('update_values', latest_data)
        eventlet.sleep(5)  # Espera 5 segundos

# Iniciar el hilo para actualizar los datos en tiempo real
threading.Thread(target=emit_data, daemon=True).start()

@app.route('/')
def index():
    """ Renderiza la página principal """
    return render_template('index.html')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader= False)