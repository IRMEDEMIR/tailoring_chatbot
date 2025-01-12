document.getElementById('chat-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  const userInput = document.getElementById('user-input').value;
  if (!userInput.trim()) return; // Boş mesajları engelle
  
  const chatbox = document.getElementById('chatbox');

  // Kullanıcı mesajını ekle
  chatbox.innerHTML += `<p class="user-message"><strong>Sen:</strong> ${userInput}</p>`;

  const keywords = await extractKeywords(userInput); // Anahtar kelimeleri çıkar
  const response = await generateResponse(keywords); // Yanıtı bekle

  // Bot yanıtını ekle
  chatbox.innerHTML += `<p class="bot-message"><strong>Manifatura:</strong> ${response}</p>`;

  // Kullanıcı girişini temizle
  document.getElementById('user-input').value = '';

  // Chatbox'ı en alta kaydır
  chatbox.scrollTop = chatbox.scrollHeight;
});


async function extractKeywords(message) {
  const keywords = {};
  const normalizedMessage = message.toLowerCase();

  try {
    // fabrics.json dosyasını getir
    const response = await fetch('fabrics.json');
    const data = await response.json();

    // Kumaş türleri
    const fabrics = data.fabrics.map(fabric => fabric.name.toLowerCase());
    fabrics.forEach(fabric => {
      if (normalizedMessage.includes(fabric)) {
        keywords.fabric = fabric;
      }
    });

    // Dikilecek ürünler
    const sewingItems = [];
    data.fabrics.forEach(fabric => {
      fabric.suggestions.forEach(suggestion => {
        if (!sewingItems.includes(suggestion.item.toLowerCase())) {
          sewingItems.push(suggestion.item.toLowerCase());
        }
      });
    });

    sewingItems.forEach(item => {
      if (normalizedMessage.includes(item)) {
        keywords.item = item;
      }
    });

    // Miktar (metre)
    const meterMatch = normalizedMessage.match(/(\d+)\s*metre/);
    if (meterMatch) {
      keywords.meter = parseInt(meterMatch[1], 10);
    }

    // Selamlaşma
    const greetings = ['merhaba', 'selam', 'hi', 'hello', 'günaydın', 'iyi akşamlar'];
    if (greetings.some(greeting => normalizedMessage.includes(greeting))) {
      keywords.greeting = true;
    }

    // Teşekkür
    const thankYouKeywords = ['teşekkür', 'teşekkürler', 'sağ ol', 'sağ olun', 'minnettarım'];
    if (thankYouKeywords.some(phrase => normalizedMessage.includes(phrase))) {
      keywords.thankYou = true;
    }

  } catch (error) {
    console.error('fabrics.json dosyası okunurken hata oluştu:', error);
  }

  return keywords;
}

async function generateResponse(keywords) {
  try {
    const response = await fetch('fabrics.json');
    const data = await response.json();

    // Selamlaşma
    if (keywords.greeting) {
      return 'Merhaba! Size nasıl yardımcı olabilirim?';
    }

    // teşekkür
    if(keywords.thankYou) {
      return 'Rica ederim bu benim görevim :)';
    }
    // Kullanıcı sadece ürün adı verdiyse
    if (keywords.item && !keywords.fabric) {
      let suggestions = [];
      data.fabrics.forEach(fabric => {
        fabric.suggestions.forEach(suggestion => {
          if (suggestion.item === keywords.item) {
            suggestions.push({
              fabric: fabric.name,
              requiredMeters: suggestion.requiredMeters
            });
          }
        });
      });

      if (suggestions.length > 0) {
        const suggestionText = suggestions
          .map(s => `${s.fabric} kumaşında ${keywords.item} dikmek için yaklaşık ${s.requiredMeters} metre gerekir.`)
          .join('<br>');

        return `
          <strong>${keywords.item}</strong> dikmek için şu kumaşları kullanabilirsiniz:<br>
          ${suggestionText}
        `;
      } else {
        return `Üzgünüm, kayıtlarımızda '${keywords.item}' için uygun kumaş bilgisi bulunamadı.`;
      }
    }

    // Kumaş kontrolü (sadece kumaş adı veya hem kumaş hem ürün belirtilmişse)
    if (keywords.fabric) {
      const fabricData = data.fabrics.find(fabric => fabric.name === keywords.fabric);
      if (fabricData) {
        const description = fabricData.description || 'Bu kumaş hakkında detaylı bilgi bulunamadı.';
        const features = `
          Bu kumaşın dokusu ${fabricData.features.texture}, 
          ${fabricData.features.shiny}, 
          ${fabricData.features.flexible} ve 
          ${fabricData.features.weight} bir kumaş türüdür.
        `;

        // Eğer kullanıcı hem kumaş hem ürün belirtmişse
        if (keywords.item) {
          const suggestion = fabricData.suggestions.find(s => s.item === keywords.item);
          if (suggestion) {
            return `
              ${description}<br>${features}
              <br><strong>${keywords.item}</strong> dikmek için yaklaşık <strong>${suggestion.requiredMeters} metre</strong> kumaşa ihtiyacınız var.
            `;
          } else {
            return `
              ${description}<br>${features}
              <br>Belirttiğiniz ürün için (${keywords.item}), bu kumaş türü uygun değil.
            `;
          }
        } else {
          // Sadece kumaş adı verilmişse
          const allSuggestions = fabricData.suggestions
            .map(s => `${s.item} (${s.requiredMeters} metre)`)
            .join(', ');
          return `
            ${description}<br>${features}
            <br>Bu kumaş ile şunları dikebilirsiniz: ${allSuggestions}.
          `;
        }
      } else {
        return `Kayıtlarımızda '${keywords.fabric}' kumaşı bulunamadı.`;
      }
    }

    // Eksik bilgi durumu
    return 'Lütfen kumaş türünü ve/veya dikmek istediğiniz ürünü belirtin, size daha iyi yardımcı olabilirim.';
  } catch (error) {
    console.error('Yanıt oluşturulurken hata oluştu:', error);
    return 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
  }
}
