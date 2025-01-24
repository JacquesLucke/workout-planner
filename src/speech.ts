export function say(text: string) {
  const url = getTextAudioUrl(text);
  const sound = new Audio(url);
  sound.play();
}

export function sayPrefetch(text: string) {
  const url = getTextAudioUrl(text);
  new Audio(url);
}

function getTextAudioUrl(text: string) {
  // Adding "[pause]" because otherwise sometimes the speech generation misses some words.
  const updatedText = "[pause] " + text;
  const encodedText = encodeURIComponent(updatedText);
  return `https://speech.jlucke.com/speak?text=${encodedText}&voice=echo&volume=3.0`;
}
