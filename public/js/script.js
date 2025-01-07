// public/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    const mainButton = document.getElementById('mainButton');
    const timerElement = document.getElementById('timer');
    const remainingTimeElement = document.getElementById('remainingTime');
    let remainingTime = remainingTimeElement ? parseInt(remainingTimeElement.textContent, 10) : 0;
  
    // Gestione countdown se c'è un timer
    if (remainingTime > 0) {
      const interval = setInterval(() => {
        remainingTime--;
        remainingTimeElement.textContent = remainingTime;
        if (remainingTime <= 0) {
          clearInterval(interval);
          // Ricarica la pagina per abilitare il pulsante
          location.reload();
        }
      }, 1000);
    }
  
    // Gestione click sul pulsante
    if (mainButton) {
      mainButton.addEventListener('click', async () => {
        // Animazione: pulsante -> spinner -> rosso -> grigio
        mainButton.innerHTML = `<div class="loader"></div>`; // icona minimal di caricamento
        // Chiamata POST al server
        try {
          const response = await fetch('/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          // Simuliamo passaggio al rosso dopo un po'
          setTimeout(() => {
            mainButton.style.backgroundColor = 'red';
          }, 1000);
          // Poi grigio e disabilitato
          setTimeout(() => {
            mainButton.style.backgroundColor = 'gray';
            mainButton.disabled = true;
            mainButton.classList.add('disabled');
            timerElement.style.display = 'block';
            // Forziamo un reload dopo 2 secondi per aggiornare il timer
            setTimeout(() => {
              location.reload();
            }, 2000);
          }, 2000);
  
        } catch (err) {
          console.error(err);
        }
      });
    }
  
    // Gestione popup email
    const emailPopup = document.getElementById('emailPopup');
    const saveEmailBtn = document.getElementById('saveEmailBtn');
    if (saveEmailBtn) {
      saveEmailBtn.addEventListener('click', async () => {
        const emailInput = document.getElementById('emailInput');
        if (emailInput.value) {
          try {
            const resp = await fetch('/save-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailInput.value })
            });
            const data = await resp.json();
            if (data.success) {
              // chiudi popup e ricarica
              emailPopup.style.display = 'none';
              location.reload();
            }
          } catch (err) {
            console.error(err);
          }
        }
      });
    }
  
    // Gestione modifica email
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    if (changeEmailBtn) {
      changeEmailBtn.addEventListener('click', () => {
        if (emailPopup) {
          emailPopup.style.display = 'block';
        }
      });
    }
  
  });