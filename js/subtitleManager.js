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
export const capSplitSentencesBtn = document.getElementById('cap-split-sentences-btn');

export let listaFrases = [];
export let indiceFraseAtual = 0;
export let indicePalavraAtual = -1;
export let palavrasElementos = [];

export let timelineGravada = [];
export let modoGravandoTempo = false;
export let ultimoTempoProcessado = 0;

let transcricaoDoAudio = [];
export let reconhecedorVoz = null;
let modeloWhisperFront = null;
let audioDecodificadoGlobal = null;

export function resetAcumuladoresAudio() {
  ultimoTempoProcessado = 0;
  audioDecodificadoGlobal = null;
  timelineGravada = [];
  listaFrases = [];
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
  captionCurrentLiveInput.value = frase;
  captionStepCounter.textContent = `${indiceFraseAtual + 1} / ${listaFrases.length}`;

  autoFitTextoNoBalao();

  capPrevBtn.classList.toggle('opacity-50', indiceFraseAtual === 0 && indicePalavraAtual <= 0);
  capPrevBtn.classList.toggle('cursor-not-allowed', indiceFraseAtual === 0 && indicePalavraAtual <= 0);
}

function formatarEm4Linhas(texto) {
  const palavras = texto.trim().split(/\s+/).filter(p => p.length > 0);
  if (palavras.length === 0) return "";
  
  const totalLinhas = 4;
  const totalPalavras = palavras.length;
  const basePorLinha = Math.floor(totalPalavras / totalLinhas);
  const resto = totalPalavras % totalLinhas;
  
  const linhas = [];
  let indiceInicio = 0;

  for (let i = 0; i < totalLinhas; i++) {
    const qtdPalavrasLinha = basePorLinha + (i < resto ? 1 : 0);
    if (qtdPalavrasLinha > 0 && indiceInicio < totalPalavras) {
      linhas.push(palavras.slice(indiceInicio, indiceInicio + qtdPalavrasLinha).join(' '));
      indiceInicio += qtdPalavrasLinha;
    }
  }

  return linhas.join('\n');
}

export function quebrarTextoEmBlocosDe3Linhas(textoCompleto) {
  const frasesBrutas = textoCompleto
    .replace(/([.?!])\s+/g, "\$1\n")
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  const blocosFinais = [];
  const LIMITE_PALAVRAS_BLOCO = 20;

  frasesBrutas.forEach(frase => {
    const palavras = frase.split(/\s+/).filter(p => p.length > 0);

    if (palavras.length <= LIMITE_PALAVRAS_BLOCO) {
      blocosFinais.push(formatarEm4Linhas(frase));
    } else {
      for (let i = 0; i < palavras.length; i += LIMITE_PALAVRAS_BLOCO) {
        const pedaco = palavras.slice(i, i + LIMITE_PALAVRAS_BLOCO).join(' ');
        blocosFinais.push(formatarEm4Linhas(pedaco));
      }
    }
  });

  return blocosFinais.length > 0 ? blocosFinais : ["..."];
}

export function atualizarListaFrases() {
  listaFrases = quebrarTextoEmBlocosDe3Linhas(captionScriptInput.value);

  if (indiceFraseAtual >= listaFrases.length) {
    indiceFraseAtual = Math.max(0, listaFrases.length - 1);
  }
  if (indiceFraseAtual < 0) {
    indiceFraseAtual = 0;
  }

  exibirFraseAtual();
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

export function reproduzirDestaquePeloTempo(tempoAtual) {
  if (timelineGravada.length === 0) return;

  let fraseAtivaIdx = -1;
  let blocoAtivo = null;

  for (let i = 0; i < timelineGravada.length; i++) {
    if (tempoAtual >= timelineGravada[i].inicio && tempoAtual <= timelineGravada[i].fim) {
      fraseAtivaIdx = timelineGravada[i].fraseIdx;
      blocoAtivo = timelineGravada[i];
      break;
    }
  }

  if (fraseAtivaIdx !== -1) {
    if (fraseAtivaIdx !== indiceFraseAtual) {
      indiceFraseAtual = fraseAtivaIdx;
      exibirFraseAtual();
    }

    if (palavrasElementos.length > 0 && blocoAtivo) {
      const progressoFrase = (tempoAtual - blocoAtivo.inicio) / Math.max(0.1, (blocoAtivo.fim - blocoAtivo.inicio));
      const pIdx = Math.min(
        palavrasElementos.length - 1,
        Math.floor(progressoFrase * palavrasElementos.length)
      );

      if (indicePalavraAtual !== pIdx) {
        indicePalavraAtual = pIdx;
        aplicarDestaqueVisual(indicePalavraAtual);
      }
    }
  } else {
    resetarDestaqueVisual();
  }
}

export function iniciarReconhecimentoDoAudio() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Reconhecimento de fala nativo não suportado neste navegador.");
    return;
  }

  if (reconhecedorVoz) {
    try { reconhecedorVoz.abort(); } catch (e) {}
  }

  transcricaoDoAudio = [];
  reconhecedorVoz = new SpeechRecognition();
  reconhecedorVoz.continuous = true;
  reconhecedorVoz.interimResults = false;
  reconhecedorVoz.lang = 'pt-BR';

  reconhecedorVoz.onresult = (evento) => {
    for (let i = evento.resultIndex; i < evento.results.length; ++i) {
      if (evento.results[i].isFinal) {
        const textoFalado = evento.results[i][0].transcript.trim();
        const tempoFim = audioElement.currentTime || 0;
        const tempoInicio = Math.max(0, tempoFim - 2.5);

        transcricaoDoAudio.push({
          texto: textoFalado,
          inicio: tempoInicio,
          fim: tempoFim
        });

        speechText.textContent = textoFalado;
        captionCurrentLiveInput.value = textoFalado;
        autoFitTextoNoBalao();
      }
    }
  };

  try {
    reconhecedorVoz.start();
  } catch (e) {
    console.log("Reconhecimento já iniciado.");
  }
}

export async function transcreverTrechoPausado() {
  const audioInput = document.getElementById('audio-input');
  const ficheiroAudio = audioInput.files && audioInput.files[0];

  if (!ficheiroAudio) {
    alert("Carregue primeiro o áudio pelo botão 'Carregar Áudio'!");
    return;
  }

  const tempoAtual = audioElement.currentTime || 0;
  const tempoInicio = ultimoTempoProcessado;
  const duracaoFatia = tempoAtual - tempoInicio;

  if (duracaoFatia <= 0.3) {
    alert("Dê Play no áudio e pause pelo menos 1 ou 2 segundos à frente para transcrever o trecho!");
    return;
  }

  const btnChunk = document.getElementById('transcribe-chunk-btn');
  const textoOriginal = btnChunk.innerHTML;
  btnChunk.innerHTML = `<span>⏳</span> Transcrevendo (${tempoInicio.toFixed(1)}s a ${tempoAtual.toFixed(1)}s)...`;
  btnChunk.disabled = true;

  try {
    if (!modeloWhisperFront) {
      btnChunk.innerHTML = "<span>⏳</span> Carregando Whisper IA...";
      modeloWhisperFront = await window.pipelineTransformers(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        { quantized: true }
      );
    }

    if (!audioDecodificadoGlobal) {
      btnChunk.innerHTML = "<span>⏳</span> Preparando buffer...";
      const arrayBuffer = await ficheiroAudio.arrayBuffer();
      const audioCtxTemp = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const decoded = await audioCtxTemp.decodeAudioData(arrayBuffer);
      audioDecodificadoGlobal = decoded.getChannelData(0);
    }

    const startSample = Math.floor(tempoInicio * 16000);
    const endSample = Math.min(Math.floor(tempoAtual * 16000), audioDecodificadoGlobal.length);

    if (startSample >= endSample) {
      alert("O cursor de áudio já atingiu o fim do arquivo.");
      return;
    }

    const fatiaPequena = audioDecodificadoGlobal.slice(startSample, endSample);

    btnChunk.innerHTML = "<span>⏳</span> Processando fala...";

    const resultado = await modeloWhisperFront(fatiaPequena, {
      sampling_rate: 16000,
      language: 'portuguese',
      task: 'transcribe',
      return_timestamps: true
    });

    if (resultado.chunks && resultado.chunks.length > 0) {
      resultado.chunks.forEach((chunk) => {
        const textoChunk = (chunk.text || '').trim();
        if (textoChunk.length > 0) {
          const tInicioRel = typeof chunk.timestamp[0] === 'number' ? chunk.timestamp[0] : 0;
          const tFimRel = typeof chunk.timestamp[1] === 'number' ? chunk.timestamp[1] : (tInicioRel + 1.5);

          const novoIdx = listaFrases.length;
          listaFrases.push(textoChunk);

          timelineGravada.push({
            fraseIdx: novoIdx,
            inicio: tempoInicio + tInicioRel,
            fim: tempoInicio + tFimRel
          });
        }
      });
    } else if (resultado.text && resultado.text.trim().length > 0) {
      const novoIdx = listaFrases.length;
      listaFrases.push(resultado.text.trim());
      timelineGravada.push({
        fraseIdx: novoIdx,
        inicio: tempoInicio,
        fim: tempoAtual
      });
    }

    captionScriptInput.value = listaFrases.join('\n');
    exibirFraseAtual();
    ultimoTempoProcessado = tempoAtual;

  } catch (err) {
    console.error("Erro ao transcrever trecho:", err);
    alert(`Erro na fatia: ${err.message || err}`);
  } finally {
    btnChunk.innerHTML = textoOriginal;
    btnChunk.disabled = false;
  }
}

function formatarTempoVTT(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  const ms = Math.floor((segundos % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function exportarArquivoVTT() {
  if (timelineGravada.length === 0) {
    alert("Nenhum trecho de legenda foi transcrito ainda!");
    return;
  }

  let conteudoVTT = "WEBVTT\n\n";
  timelineGravada.forEach((item) => {
    conteudoVTT += `${formatarTempoVTT(item.inicio)} --> ${formatarTempoVTT(item.fim)}\n`;
    conteudoVTT += `${listaFrases[item.fraseIdx]}\n\n`;
  });

  const blob = new Blob([conteudoVTT], { type: 'text/vtt;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `legenda_audio_${Date.now()}.vtt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}