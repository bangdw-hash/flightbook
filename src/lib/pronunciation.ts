const phones: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ",
  ER: "ɝ", EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ",
  K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "ɹ", S: "s",
  SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};
const onsets = new Set("BL BR DR DW FL FR GL GR KL KR KW PL PR SL SM SN SP ST SW TR TW THR SK SH RY FY MY NY PY TY VY KY GY SPL SPR STR SKR SKW".split(" "));

export function toIpa(pronunciation: string) {
  const parts = pronunciation.split(" ");
  const stresses = new Map<number, string>();
  let previousVowel = -1;
  parts.forEach((phone, index) => {
    const stress = phone.slice(-1);
    if (!/[012]/.test(stress)) return;
    if (stress !== "0") {
      let onset = previousVowel < 0 ? 0 : index;
      for (let count = 1; previousVowel >= 0 && count <= Math.min(index - previousVowel - 1, 3); count++) {
        const consonants = parts.slice(index - count, index);
        if ((count === 1 && consonants[0] !== "NG") || onsets.has(consonants.join(""))) onset = index - count;
      }
      stresses.set(onset, stress === "1" ? "ˈ" : "ˌ");
    }
    previousVowel = index;
  });
  return parts.map((phone, index) => {
    const symbol = phone === "AH0" ? "ə" : phone === "ER0" ? "ɚ" : phones[phone.replace(/[012]$/, "")];
    return (stresses.get(index) ?? "") + (symbol ?? "");
  }).join("");
}

export function pronunciationWords(text: string, dictionary: Record<string, string>) {
  return (text.replace(/[‘’]/g, "'").match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? []).map((word) => {
    const key = word.toLowerCase();
    const phonemes = dictionary[key] ?? (key.endsWith("'s") ? dictionary[key.slice(0, -2) + "s"] : undefined);
    return { word, ipa: phonemes ? toIpa(phonemes) : null };
  });
}
