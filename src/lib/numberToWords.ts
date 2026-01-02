// Convert number to Brazilian Portuguese currency words (reais e centavos)
const ones = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'
];

const tens = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'
];

const hundreds = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  let result = '';
  
  if (n >= 100) {
    result += hundreds[Math.floor(n / 100)];
    n %= 100;
    if (n > 0) result += ' e ';
  }
  
  if (n >= 20) {
    result += tens[Math.floor(n / 10)];
    n %= 10;
    if (n > 0) result += ' e ';
  }
  
  if (n > 0 && n < 20) {
    result += ones[n];
  }
  
  return result;
}

function convertNumber(n: number): string {
  if (n === 0) return 'zero';
  if (n < 0) return 'menos ' + convertNumber(-n);

  const parts: string[] = [];
  
  // Bilhões
  if (n >= 1000000000) {
    const billions = Math.floor(n / 1000000000);
    parts.push(convertLessThanThousand(billions) + (billions === 1 ? ' bilhão' : ' bilhões'));
    n %= 1000000000;
  }
  
  // Milhões
  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    parts.push(convertLessThanThousand(millions) + (millions === 1 ? ' milhão' : ' milhões'));
    n %= 1000000;
  }
  
  // Milhares
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    if (thousands === 1) {
      parts.push('mil');
    } else {
      parts.push(convertLessThanThousand(thousands) + ' mil');
    }
    n %= 1000;
  }
  
  // Centenas
  if (n > 0) {
    const lastPart = convertLessThanThousand(n);
    if (parts.length > 0 && n < 100) {
      parts.push('e ' + lastPart);
    } else if (parts.length > 0) {
      parts.push(lastPart);
    } else {
      parts.push(lastPart);
    }
  }
  
  // Join parts
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    if (i === 0) {
      result = parts[i];
    } else if (parts[i].startsWith('e ')) {
      result += ' ' + parts[i];
    } else if (i === parts.length - 1 && parts[i].length > 0 && !parts[i].startsWith('e ')) {
      result += ' e ' + parts[i];
    } else {
      result += ' ' + parts[i];
    }
  }
  
  return result.trim();
}

export function numberToCurrencyWords(value: number): string {
  if (isNaN(value)) return '';
  
  const integerPart = Math.floor(Math.abs(value));
  const decimalPart = Math.round((Math.abs(value) - integerPart) * 100);
  
  let result = '';
  
  // Integer part (reais)
  if (integerPart === 0 && decimalPart === 0) {
    return 'zero reais';
  }
  
  if (integerPart > 0) {
    result = convertNumber(integerPart);
    result += integerPart === 1 ? ' real' : ' reais';
  }
  
  // Decimal part (centavos)
  if (decimalPart > 0) {
    if (integerPart > 0) {
      result += ' e ';
    }
    result += convertNumber(decimalPart);
    result += decimalPart === 1 ? ' centavo' : ' centavos';
  }
  
  return result;
}

// Format currency value with the full format: R$ X.XXX,XX (value por extenso)
export function formatCurrencyWithExtension(value: number): string {
  const formattedNumber = value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  const words = numberToCurrencyWords(value);
  return `R$ ${formattedNumber} (${words})`;
}
