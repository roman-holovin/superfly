export function merge(target, ...sources) {
  for (let i in sources) {
    const source = sources[i];
    for (let j in source) {
      target[j] = source[j];
    }
  }

  return target;
}
