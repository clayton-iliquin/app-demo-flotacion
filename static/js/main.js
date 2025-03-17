// 1) Conectar con Socket.IO
var socket = io.connect('http://' + document.domain + ':' + location.port, {
    transports: ['websocket', 'polling']
  });
  
  // Variables globales para Real vs Predicho (para calcular error)
  let predicted = 0;
  let real = 0;
  
  // 2) Crear gráfico de tendencias (líneas)
  const trendCtx = document.getElementById('trendChart').getContext('2d');
  const trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: [],
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
          title: { display: true, text: 'Tiempo' }
        },
        y: {
          title: { display: true, text: 'Rougher Recovery' }
        }
      }
    }
  });
  
  // Función para actualizar el gráfico de tendencias
  function updateTrendChart(time, predVal, realVal) {
    trendChart.data.labels.push(time);
    trendChart.data.datasets[0].data.push(predVal);
    trendChart.data.datasets[1].data.push(realVal);
  
    // Mantener los últimos 20 datos (p.ej.)
    if (trendChart.data.labels.length > 20) {
      trendChart.data.labels.shift();
      trendChart.data.datasets[0].data.shift();
      trendChart.data.datasets[1].data.shift();
    }
    trendChart.update();
  }
  
  // 3) Crear gráfico de barras horizontal para SHAP
  const shapCtx = document.getElementById('shapChart').getContext('2d');
  const shapChart = new Chart(shapCtx, {
    type: 'bar',
    data: {
      labels: [],  // Nombres de variables
      datasets: [
        {
          label: 'Valor SHAP',
          data: [],
          backgroundColor: [],
        }
      ]
    },
    options: {
      indexAxis: 'y', // Horizontal
      responsive: true,
      maintainAspectRatio: false,  // Permite que el gráfico se expanda
      scales: {
        x: {
          title: { display: true, text: 'Importancia (SHAP)' }
        },
        y: {
          title: { display: true, text: 'Variable' }
        }
      },
      layout: {
        padding: 10 // Espaciado interno para evitar que se superpongan los textos
      }
    }
  });
  
  // Función para actualizar el gráfico de SHAP con los 5 valores más extremos
  const VALID_SHAP_KEYS = [
    'Diesel_shap',
    'Feed_Flow_shap',
    'Feed_Grade_Cu_shap',
    'Feed_Grade_Fe_shap',
    'Feed_Grade_Mo_shap',
    'Lime_Consumption_shap',
    'ORP_Rougher_shap',
    'P80_shap',
    'Primary_Collector_shap',
    'Pulp_Density_shap',
    'Rougher_Gas_Concentration_shap',
    'Rougher_Viscosity_shap',
    'Solids_Percentage_shap',
    'random_variable_shap'
  ];
  function updateShapChart(shapData) {
    // 1. Crear un objeto filtrado que solo contenga las claves deseadas
    const filteredData = {};
    for (let key of VALID_SHAP_KEYS) {
      if (shapData.hasOwnProperty(key)) {
        filteredData[key] = shapData[key];
      }
    }
  
    // 2. Convertir el objeto filtrado en array de { name, value }
    const entries = Object.entries(filteredData).map(([key, val]) => {
      return { name: key, value: parseFloat(val) };
    });
  
    // 3. Ordenar por valor absoluto descendente
    entries.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  
    // 4. Tomar los 5 más extremos
    const top5 = entries.slice(0, 5);
  
    // 5. Preparar arrays para Chart.js
    const labels = top5.map(item => item.name);
    const values = top5.map(item => item.value);
    const colors = top5.map(item => {
      // Si es negativo => rojo, si positivo => azul
      return item.value < 0 ? 'red' : 'blue';
    });
  
    // 6. Actualizar datos en shapChart
    shapChart.data.labels = labels;
    shapChart.data.datasets[0].data = values;
    shapChart.data.datasets[0].backgroundColor = colors;
    shapChart.update();

    // // 6. Ajustar la altura según el número de valores
    // let chartContainer = document.getElementById('shapChart').parentNode;
    // chartContainer.style.height = `${Math.max(150, top5.length * 30)}px`;
  }
  
  
  
  // 4) Escuchar evento update_values
  socket.on('update_values', function(data) {
    console.log("📡 Datos recibidos en frontend:", data);
  
    // (A) Ver si hay datos de Flotation_Predicted
    if (data['Flotation_Predicted']) {
      // Asumiendo la clave "rougher_recovery" o "Rougher Recovery"
      predicted = parseFloat(data['Flotation_Predicted']['Rougher_Recovery'] || 0);
      document.getElementById('flotation_predicted').innerText = predicted.toFixed(2);
  
      // Actualizar el gráfico SHAP
      // => Solo hazlo si existen tus variables Diesel_shap, etc. en data['Flotation_Predicted']
      updateShapChart(data['Flotation_Predicted']);
    }
  
    // (B) Ver si hay datos de Flotation (Real)
    if (data['Flotation']) {
      real = parseFloat(data['Flotation']['Rougher Recovery'] || 0);
      const feedGradeCu = parseFloat(data['Flotation']['Feed Grade Cu'] || 0);
  
      // Mostrar en Value Boxes
      document.getElementById('flotation').innerText = real.toFixed(2);
      document.getElementById('feed_grade').innerText = feedGradeCu.toFixed(2);
  
      // Calcular error (%)
      let errorPercent = 0;
      if (real !== 0) {
        errorPercent = Math.abs((real - predicted) / real) * 100;
      }
      let errorBox = document.getElementById('error_box');
      errorBox.innerText = errorPercent.toFixed(2) + "%";
  
      // Color en caso exceda 5%
      errorBox.style.color = (errorPercent > 5) ? "red" : "black";
  
      // (C) Actualizar el gráfico de tendencia
      let now = new Date().toLocaleTimeString();
      updateTrendChart(now, predicted, real);
    }
  });
  

// Primera Versión
// // Establecer la conexión con Socket.IO
// var socket = io.connect('http://' + document.domain + ':' + location.port, {
//     transports: ['websocket', 'polling']
//   });
  
//   // Variables para guardar valores (en caso de necesitarlos)
//   let predicted = 0;
//   let real = 0;
  
//   // 1) Inicializar el gráfico de tendencias con Chart.js
//   const ctx = document.getElementById('trendChart').getContext('2d');
//   const trendChart = new Chart(ctx, {
//     type: 'line',
//     data: {
//       labels: [], // Aquí iremos colocando timestamps
//       datasets: [
//         {
//           label: 'Rougher Recovery (Predicho)',
//           borderColor: 'blue',
//           backgroundColor: 'rgba(0, 0, 255, 0.1)',
//           data: [],
//           fill: false,
//           tension: 0.1
//         },
//         {
//           label: 'Rougher Recovery (Real)',
//           borderColor: 'orange',
//           backgroundColor: 'rgba(255, 165, 0, 0.1)',
//           data: [],
//           fill: false,
//           tension: 0.1
//         }
//       ]
//     },
//     options: {
//       responsive: true,
//       scales: {
//         x: {
//           title: {
//             display: true,
//             text: 'Tiempo'
//           }
//         },
//         y: {
//           title: {
//             display: true,
//             text: 'Rougher Recovery'
//           }
//         }
//       }
//     }
//   });
  
//   // 2) Función para actualizar el gráfico
//   function updateChart(time, predictedVal, realVal) {
//     trendChart.data.labels.push(time);
//     trendChart.data.datasets[0].data.push(predictedVal);
//     trendChart.data.datasets[1].data.push(realVal);
  
//     // Mantener solo los últimos 10 puntos (por ejemplo)
//     if (trendChart.data.labels.length > 50) {
//       trendChart.data.labels.shift();
//       trendChart.data.datasets[0].data.shift();
//       trendChart.data.datasets[1].data.shift();
//     }
  
//     trendChart.update();
//   }
  
//   // 3) Cuando el servidor envía datos nuevos
//   socket.on('update_values', function(data) {
//     console.log("📡 Datos recibidos en frontend:", data);
  
//     // Flotation_Predicted
//     if (data['Flotation_Predicted']) {
//       // Asumiendo que la clave sea 'rougher_recovery' o 'Rougher Recovery'
//       predicted = parseFloat(data['Flotation_Predicted']['Rougher_Recovery'] || 0);
//       let predictedFixed = predicted.toFixed(2);
//       document.getElementById('flotation_predicted').innerText = predictedFixed;
//     }
  
//     // Flotation (Real)
//     if (data['Flotation']) {
//       real = parseFloat(data['Flotation']['Rougher Recovery'] || 0);
//       let feedGradeCu = parseFloat(data['Flotation']['Feed Grade Cu'] || 0);
  
//       // Mostrar con 2 decimales
//       document.getElementById('flotation').innerText = real.toFixed(2);
//       document.getElementById('feed_grade').innerText = feedGradeCu.toFixed(2);
  
//       // Calcular error (%)
//       // Evita división por cero si real == 0
//       let errorPercent = 0;
//       if (real !== 0) {
//         errorPercent = Math.abs((real - predicted) / real) * 100;
//       }
  
//       let errorBox = document.getElementById('error_box');
//       errorBox.innerText = errorPercent.toFixed(2) + "%";
  
//       if (errorPercent > 5) {
//         errorBox.style.color = "red";
//       } else {
//         errorBox.style.color = "black";
//       }
  
//       // Actualizar el gráfico
//       let now = new Date().toLocaleTimeString();
//       updateChart(now, predicted, real);
//     }
//   });
  