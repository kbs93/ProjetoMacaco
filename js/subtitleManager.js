import { audioElement } from './audioManager.js';

export const speechBubble = document.getElementById('speech-bubble');
export const speechTextArea = document.getElementById('speech-text-area');
export const speechText = document.getElementById('speech-text');

export const captionScriptInput = document.getElementById('caption-script-input');
export const captionCurrentLiveInput = document.getElementById('caption-current-live-input');
export const capPrevBtn = document.getElementById('cap-prev-btn');
export const capNextBtn = document.getElementById('cap-next-btn');
export const capResetBtn = document.getElementById('cap-reset-btn');
export const captionStepCounter = document.getElementById('caption-step-counter');
export const syncPhraseBtn = document.getElementById('sync-phrase-btn');

export let listaFrases = [];
export let indiceFraseAtual = 0;
export let indicePalavraAtual = -1;
export let palavrasElementos = [];

export let timelineGravada = [];
export let modoGravandoTempo = false;
export let ultimoTempoProcessado = 0;

export function resetAcumuladoresAudio() {
  ultimoTempoProcessado = 0;
  timelineGravada = [];
  listaFrases = [];
  modoGravandoTempo = false;
}

export function renderizarFraseComPalavras(texto) {
  speechText.innerHTML = '';
  palavrasElementos = [];

  const palavras = texto.trim().split(/\s+/).filter(p => p.length > 0);
  if (palavras.length === 0) return;

  palavras.forEach((palavra, index) => {
    const spanWord = document.createElement('span');
    spanWord.className = 'karaoke-word';
    spanWord.textContent = palavra;
    speechText.appendChild(spanWord);
    palavrasElementos.push(spanWord);

    if (index < palavras.length - 1) {
      speechText.appendChild(document.createTextNode(' '));
    }
  });
}

export function aplicarDestaqueVisual(idx) {
  palavrasElementos.forEach((el, i) => {
    el.classList.toggle('karaoke-active', i === idx);
  });
}

export function resetarDestaqueVisual() {
  indicePalavraAtual = -1;
  palavrasElementos.forEach(el => el.classList.remove('karaoke-active'));
}

export function autoFitTextoNoBalao() {
  const capFontSize = document.getElementById('cap-font-size');
  const maxFontSize = parseInt(capFontSize.value, 10) || 22;
  let fontSizeAtual = maxFontSize;

  speechText.style.fontSize = `${fontSizeAtual}px`;

  const areaLargura = speechTextArea.clientWidth - 10;
  const areaAltura = speechTextArea.clientHeight - 8;

  if (areaLargura <= 0 || areaAltura <= 0) return;

  while (
    (speechText.offsetWidth > areaLargura || 
     speechText.offsetHeight > areaAltura || 
     speechText.scrollWidth > areaLargura || 
     speechText.scrollHeight > areaAltura) && 
    fontSizeAtual > 14
  ) {
    fontSizeAtual -= 0.5;
    speechText.style.fontSize = `${fontSizeAtual}px`;
  }
}

export function exibirFraseAtual() {
  const frase = listaFrases[indiceFraseAtual] || "";
  renderizarFraseComPalavras(frase);
  if (captionCurrentLiveInput) {
    captionCurrentLiveInput.value = frase;
  }
  if (captionStepCounter) {
    captionStepCounter.textContent = `${indiceFraseAtual + 1} / ${Math.max(1, listaFrases.length)}`;
  }

  autoFitTextoNoBalao();

  if (capPrevBtn) {
    capPrevBtn.classList.toggle('opacity-50', indiceFraseAtual === 0 && indicePalavraAtual <= 0);
    capPrevBtn.classList.toggle('cursor-not-allowed', indiceFraseAtual === 0 && indicePalavraAtual <= 0);
  }
}

// Atualização direta por linha: cada linha da textarea corresponde a uma frase
export function atualizarListaFrases() {
  if (!captionScriptInput) return;

  const linhas = captionScriptInput.value
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  listaFrases = linhas.length > 0 ? linhas : ["..."];

  if (timelineGravada.length > 0) {
    timelineGravada.forEach((item, idx) => {
      if (listaFrases[idx] !== undefined) {
        item.texto = listaFrases[idx];
      }
    });
  }

  if (indiceFraseAtual >= listaFrases.length) {
    indiceFraseAtual = Math.max(0, listaFrases.length - 1);
  }
  if (indiceFraseAtual < 0) {
    indiceFraseAtual = 0;
  }

  exibirFraseAtual();
}

if (captionScriptInput) {
  captionScriptInput.addEventListener('input', () => {
    atualizarListaFrases();
  });
}

export function avancarPalavraComSincronia() {
  indicePalavraAtual++;

  if (indicePalavraAtual >= palavrasElementos.length) {
    if (indiceFraseAtual < listaFrases.length - 1) {
      indiceFraseAtual++;
      indicePalavraAtual = 0;
      exibirFraseAtual();
    } else {
      indicePalavraAtual = palavrasElementos.length - 1;
    }
  }

  aplicarDestaqueVisual(indicePalavraAtual);
}

export function voltarPalavraComSincronia() {
  if (indicePalavraAtual > 0) {
    indicePalavraAtual--;
    aplicarDestaqueVisual(indicePalavraAtual);
  } else if (indiceFraseAtual > 0) {
    indiceFraseAtual--;
    exibirFraseAtual();
    indicePalavraAtual = Math.max(0, palavrasElementos.length - 1);
    aplicarDestaqueVisual(indicePalavraAtual);
  }
}

// Reprodução automática da timeline gravada
export function reproduzirDestaquePeloTempo(tempoAtual) {
  // Não interfere enquanto você estiver no processo manual de marcar as frases
  if (modoGravandoTempo) return;
  if (timelineGravada.length === 0) return;

  let fraseAtivaIdx = -1;
  let blocoAtivo = null;

  for (let i = 0; i < timelineGravada.length; i++) {
    if (timelineGravada[i] && typeof timelineGravada[i].inicio === 'number') {
      if (tempoAtual >= timelineGravada[i].inicio && tempoAtual <= timelineGravada[i].fim) {
        fraseAtivaIdx = timelineGravada[i].fraseIdx;
        blocoAtivo = timelineGravada[i];
        break;
      }
    }
  }

  if (fraseAtivaIdx !== -1) {
    if (fraseAtivaIdx !== indiceFraseAtual) {
      indiceFraseAtual = fraseAtivaIdx;
      exibirFraseAtual();
    }

    if (palavrasElementos.length > 0 && blocoAtivo) {
      const duracaoTotal = Math.max(0.1, blocoAtivo.fim - blocoAtivo.inicio);
      const progressoFrase = Math.min(1, Math.max(0, (tempoAtual - blocoAtivo.inicio) / duracaoTotal));

      const totalChars = palavrasElementos.reduce((acc, el) => acc + el.textContent.length, 0);
      let charsAlvo = progressoFrase * totalChars;
      let pIdx = 0;

      for (let i = 0; i < palavrasElementos.length; i++) {
        charsAlvo -= palavrasElementos[i].textContent.length;
        if (charsAlvo <= 0) {
          pIdx = i;
          break;
        }
      }

      if (indicePalavraAtual !== pIdx) {
        indicePalavraAtual = pIdx;
        aplicarDestaqueVisual(indicePalavraAtual);
      }
    }
  } else {
    resetarDestaqueVisual();
  }
}

// Função principal de sincronia: marca a frase atual e avança para a próxima
export function sincronizarFraseAoVivo() {
  if (listaFrases.length === 0 || (listaFrases.length === 1 && listaFrases[0] === "...")) {
    atualizarListaFrases();
  }

  if (listaFrases.length === 0) return;

  // Ativa a flag para a animação não atrapalhar a sua marcação manual
  modoGravandoTempo = true;

  const tempoAtual = audioElement.currentTime || 0;

  // 1. Fecha o tempo final da frase anterior
  if (indiceFraseAtual > 0 && timelineGravada[indiceFraseAtual - 1]) {
    timelineGravada[indiceFraseAtual - 1].fim = tempoAtual;
  }

  // 2. Grava o início da frase atual exibida no balão
  timelineGravada[indiceFraseAtual] = {
    fraseIdx: indiceFraseAtual,
    texto: listaFrases[indiceFraseAtual],
    inicio: tempoAtual,
    fim: tempoAtual + 2.5
  };

  // 3. Se houver próxima frase, avança imediatamente no balão
  if (indiceFraseAtual < listaFrases.length - 1) {
    indiceFraseAtual++;
    exibirFraseAtual();
  } else {
    // Última frase alcançada
    timelineGravada[indiceFraseAtual].fim = audioElement.duration || (tempoAtual + 2.5);
    modoGravandoTempo = false;
  }
}

// Ouvinte de clique no botão azul da interface
if (syncPhraseBtn) {
  syncPhraseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sincronizarFraseAoVivo();
  });
}

// Ouvinte da Barra de Espaço
window.addEventListener('keydown', (e) => {
  if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return;

  if (e.code === 'Space') {
    e.preventDefault();
    sincronizarFraseAoVivo();
  }
});