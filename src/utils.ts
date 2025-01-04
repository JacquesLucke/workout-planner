export function shuffleArray<T>(array: T[]) {
  let currentIndex = array.length;
  let randomIndex: number;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function repeatToLength<T>(array: T[], length: number) {
  const result: T[] = [];
  for (let i = 0; i < length; i++) {
    result.push(array[i % array.length]);
  }
  return result;
}

export function randomChoiceUniqueN<T>(array: T[], n: number) {
  const arrayCopy = [...array];
  shuffleArray(arrayCopy);
  return arrayCopy.slice(0, n);
}

export function randomIntegerInRangeInclusive(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getDaysDifference(prev: Date, now: Date) {
  const prevDay = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 86400000;
  const days = Math.floor((nowDay.getTime() - prevDay.getTime()) / msPerDay);
  return days;
}

export function getStringForLastTime(prev: Date | null, now: Date) {
  if (prev === null) {
    return "Never";
  }
  const days = getDaysDifference(prev, now);
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  return `${days} days ago`;
}
