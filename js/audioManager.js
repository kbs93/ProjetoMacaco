export const audioElement = document.getElementById('audio-player');
export let audioCtx = null;
export let analyserNode = null;
export let audioDestNode = null;
let audioSource = null;
let freqDataArray = null;
let timeDataArray = null;

let filterLow = null;
let filterMidLow = null;
let filterPresence = null;
let filterHigh = null;
let compressorNode = null;
let masterVoiceGain = null;

export const velocidadesAudio = [1.0, 0.75, 0.50, 1.25, 1.5];
export let indiceVelAudio = 0;
export let audioPlaybackRate = velocidadesAudio[indiceVelAudio];

export const modelosVoz = [
  { nome: "Natural", preservarTom: true, fatorPitch: 1.0, lowGain: 0, midLowGain: 0, presenceGain: 0, highGain: 0, compThreshold: -24, volumeGain: 1.0 },
  { nome: "Calma / Aveludada", preservarTom: true, fatorPitch: 0.96, lowGain: 4.0, midLowGain: 2.0, presenceGain: -4.0, highGain: -10.0, compThreshold: -30, volumeGain: 1.2 },
  { nome: "Séria / Confiante", preservarTom: true, fatorPitch: 0.94, lowGain: 9.0, midLowGain: 3.5, presenceGain: 2.0, highGain: -3.0, compThreshold: -22, volumeGain: 1.15 },
  { nome: "Extrovertida / Energética", preservarTom: true, fatorPitch: 1.04, lowGain: -3.0, midLowGain: -1.0, presenceGain: 8.0, highGain: 6.0, compThreshold: -28, volumeGain: 1.05 },
  { nome: "Radialista / Podcast FM", preservarTom: true, fatorPitch: 0.98, lowGain: 8.0, midLowGain: 1.0, presenceGain: 5.0, highGain: 4.0, compThreshold: -34, volumeGain: 1.2 },
  { nome: "Intimista / Noturna", preservarTom: true, fatorPitch: 0.95, lowGain: 6.0, midLowGain: 3.0, presenceGain: -2.0, highGain: -8.0, compThreshold: -26, volumeGain: 1.25 },
  { nome: "Alegre / Animada", preservarTom: false, fatorPitch: 1.18, lowGain: -4.0, midLowGain: -2.0, presenceGain: 6.0, highGain: 5.0, compThreshold: -24, volumeGain: 1.0 },
  { nome: "Grave / Profunda", preservarTom: false, fatorPitch: 0.82, lowGain: 12.0, midLowGain: 4.0, presenceGain: -2.0, highGain: -6.0, compThreshold: -20, volumeGain: 1.3 },
  { nome: "Infantil / Brincalhona", preservarTom: false, fatorPitch: 1.35, lowGain: -8.0, midLowGain: -3.0, presenceGain: 7.0, highGain: 7.0, compThreshold: -25, volumeGain: 0.95 }
];
export let indiceVozAtual = 0;

export function setIndiceVozAtual(idx) {
  indiceVozAtual = idx;
}

export function formatarSegundos(seg) {
  if (isNaN(seg)) return "00:00";
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function aplicarTaxaAudio() {
  const config = modelosVoz[indiceVozAtual] || modelosVoz[0];
  const taxaFinal = audioPlaybackRate * config.fatorPitch;

  audioElement.preservesPitch = config.preservarTom;
  audioElement.webkitPreservesPitch = config.preservarTom;
  audioElement.mozPreservesPitch = config.preservarTom;

  audioElement.defaultPlaybackRate = taxaFinal;
  audioElement.playbackRate = taxaFinal;

  if (audioCtx && filterLow && filterMidLow && filterPresence && filterHigh && compressorNode && masterVoiceGain) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    filterLow.gain.setTargetAtTime(config.lowGain, t, 0.05);
    filterMidLow.gain.setTargetAtTime(config.midLowGain, t, 0.05);
    filterPresence.gain.setTargetAtTime(config.presenceGain, t, 0.05);
    filterHigh.gain.setTargetAtTime(config.highGain, t, 0.05);
    compressorNode.threshold.setTargetAtTime(config.compThreshold, t, 0.05);
    masterVoiceGain.gain.setTargetAtTime(config.volumeGain, t, 0.05);
  }
}

export function alternarVelocidadeAudio() {
  indiceVelAudio = (indiceVelAudio + 1) % velocidadesAudio.length;
  audioPlaybackRate = velocidadesAudio[indiceVelAudio];
  aplicarTaxaAudio();
  return audioPlaybackRate;
}

export function initAudioPipeline() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 1024;
    analyserNode.smoothingTimeConstant = 0.20;

    audioDestNode = audioCtx.createMediaStreamDestination();

    filterLow = audioCtx.createBiquadFilter();
    filterLow.type = 'lowshelf';
    filterLow.frequency.value = 180;

    filterMidLow = audioCtx.createBiquadFilter();
    filterMidLow.type = 'peaking';
    filterMidLow.frequency.value = 450;
    filterMidLow.Q.value = 1.2;

    filterPresence = audioCtx.createBiquadFilter();
    filterPresence.type = 'peaking';
    filterPresence.frequency.value = 3200;
    filterPresence.Q.value = 1.0;

    filterHigh = audioCtx.createBiquadFilter();
    filterHigh.type = 'highshelf';
    filterHigh.frequency.value = 7000;

    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -24;
    compressorNode.knee.value = 20;
    compressorNode.ratio.value = 4;
    compressorNode.attack.value = 0.005;
    compressorNode.release.value = 0.15;

    masterVoiceGain = audioCtx.createGain();
    masterVoiceGain.gain.value = 1.0;

    audioSource = audioCtx.createMediaElementSource(audioElement);

    audioSource.connect(filterLow);
    filterLow.connect(filterMidLow);
    filterMidLow.connect(filterPresence);
    filterPresence.connect(filterHigh);
    filterHigh.connect(compressorNode);
    compressorNode.connect(masterVoiceGain);
    masterVoiceGain.connect(analyserNode);

    analyserNode.connect(audioCtx.destination);
    analyserNode.connect(audioDestNode);

    freqDataArray = new Uint8Array(analyserNode.frequencyBinCount);
    timeDataArray = new Uint8Array(analyserNode.frequencyBinCount);
  }

  if (audioCtx && audioCtx.state !== 'running') {
    audioCtx.resume();
  }
}

export function analisarAudioEspectro() {
  if (!analyserNode || audioElement.paused) {
    return { volume: 0, fGrave: 0, fVogalAberta: 0, fVogalMedia: 0, fAgudo: 0 };
  }

  analyserNode.getByteTimeDomainData(timeDataArray);
  analyserNode.getByteFrequencyData(freqDataArray);

  let somaQuadrados = 0;
  for (let i = 0; i < timeDataArray.length; i++) {
    const norm = (timeDataArray[i] - 128) / 128;
    somaQuadrados += norm * norm;
  }
  const volume = Math.min(Math.sqrt(somaQuadrados / timeDataArray.length) * 4.5, 1.0);

  const taxaAmostragem = audioCtx.sampleRate || 44100;
  const binHz = (taxaAmostragem / 2) / freqDataArray.length;

  function calcularMediaFaixa(hzInicio, hzFim) {
    const iStart = Math.max(1, Math.floor(hzInicio / binHz));
    const iEnd = Math.min(freqDataArray.length - 1, Math.floor(hzFim / binHz));
    let soma = 0;
    let count = 0;
    for (let i = iStart; i <= iEnd; i++) {
      soma += freqDataArray[i];
      count++;
    }
    return count > 0 ? (soma / (count * 255)) : 0;
  }

  const fGrave = calcularMediaFaixa(150, 450);
  const fVogalAberta = calcularMediaFaixa(600, 1100);
  const fVogalMedia = calcularMediaFaixa(1100, 2400);
  const fAgudo = calcularMediaFaixa(3500, 7500);

  return { volume, fGrave, fVogalAberta, fVogalMedia, fAgudo };
}