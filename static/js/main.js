// Establecer la conexión con Socket.IO
var socket = io.connect('http://' + document.domain + ':' + location.port, {
    transports: ['websocket', 'polling']
  });
  
  // Variables para guardar valores (en caso de necesitarlos)
  let predicted = 0;
  let real = 0;
  
  // 1) Inicializar el gráfico de tendencias con Chart.js
  const ctx = document.getElementById('trendChart').getContext('2d');
  const trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [], // Aquí iremos colocando timestamps
      datasets: [
        {
          label: 'Rougher Recovery (Predicho)',
          borderColor: 'blue',
          backgroundColor: 'rgba(0, 0, 255, 0.1)',
          data: [],
          fill: false,
          tension: 0.1
        },
        {
          label: 'Rougher Recovery (Real)',
          borderColor: 'orange',
          backgroundColor: 'rgba(255, 165, 0, 0.1)',
          data: [],
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Tiempo'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Rougher Recovery'
          }
        }
      }
    }
  });
  
  // 2) Función para actualizar el gráfico
  function updateChart(time, predictedVal, realVal) {
    trendChart.data.labels.push(time);
    trendChart.data.datasets[0].data.push(predictedVal);
    trendChart.data.datasets[1].data.push(realVal);
  
    // Mantener solo los últimos 10 puntos (por ejemplo)
    if (trendChart.data.labels.length > 50) {
      trendChart.data.labels.shift();
      trendChart.data.datasets[0].data.shift();
      trendChart.data.datasets[1].data.shift();
    }
  
    trendChart.update();
  }
  
  // 3) Cuando el servidor envía datos nuevos
  socket.on('update_values', function(data) {
    console.log("📡 Datos recibidos en frontend:", data);
  
    // Flotation_Predicted
    if (data['Flotation_Predicted']) {
      // Asumiendo que la clave sea 'rougher_recovery' o 'Rougher Recovery'
      predicted = parseFloat(data['Flotation_Predicted']['Rougher_Recovery'] || 0);
      let predictedFixed = predicted.toFixed(2);
      document.getElementById('flotation_predicted').innerText = predictedFixed;
    }
  
    // Flotation (Real)
    if (data['Flotation']) {
      real = parseFloat(data['Flotation']['Rougher Recovery'] || 0);
      let feedGradeCu = parseFloat(data['Flotation']['Feed Grade Cu'] || 0);
  
      // Mostrar con 2 decimales
      document.getElementById('flotation').innerText = real.toFixed(2);
      document.getElementById('feed_grade').innerText = feedGradeCu.toFixed(2);
  
      // Calcular error (%)
      // Evita división por cero si real == 0
      let errorPercent = 0;
      if (real !== 0) {
        errorPercent = Math.abs((real - predicted) / real) * 100;
      }
  
      let errorBox = document.getElementById('error_box');
      errorBox.innerText = errorPercent.toFixed(2) + "%";
  
      if (errorPercent > 5) {
        errorBox.style.color = "red";
      } else {
        errorBox.style.color = "black";
      }
  
      // Actualizar el gráfico
      let now = new Date().toLocaleTimeString();
      updateChart(now, predicted, real);
    }
  });
  