export function say(text: string) {
  // Adding "[pause]" because otherwise sometimes the speech generation misses some words.
  const updatedText = "[pause] " + text;
  const encodedText = encodeURIComponent(updatedText);
  const sound = new Audio(
    `https://speech.jlucke.com/speak?text=${encodedText}&voice=echo&volume=3.0`
  );
  sound.play();
}
