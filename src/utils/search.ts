import { WhereExpressionBuilder } from 'typeorm';

/**
 * 한글 모음 매핑
 */
export const vowelMap = {
  ㅏ: '[아-잏]',
  ㅐ: '[애-앻]',
  ㅑ: '[야-잫]',
  ㅒ: '[얘-얗]',
  ㅓ: '[어-엗]',
  ㅔ: '[에-엣]',
  ㅕ: '[여-옇]',
  ㅖ: '[예-옏]',
  ㅗ: '[오-옣]',
  ㅘ: '[와-왇]',
  ㅙ: '[왜-왯]',
  ㅚ: '[외-욓]',
  ㅛ: '[요-욯]',
  ㅜ: '[우-웇]',
  ㅝ: '[워-웧]',
  ㅞ: '[웨-웯]',
  ㅟ: '[위-윗]',
  ㅠ: '[유-윻]',
  ㅡ: '[으-읗]',
  ㅢ: '[의-읻]',
  ㅣ: '[이-잏]',
} as const;

/**
 * 한글 자음 매핑
 */
export const consonantMap = {
  ㄱ: '[가-깋]',
  ㄲ: '[까-낗]',
  ㄴ: '[나-닣]',
  ㄷ: '[다-딯]',
  ㄸ: '[따-띻]',
  ㄹ: '[라-맇]',
  ㅁ: '[마-밓]',
  ㅂ: '[바-빟]',
  ㅃ: '[빠-삫]',
  ㅅ: '[사-싷]',
  ㅆ: '[싸-앃]',
  ㅇ: '[아-잏]',
  ㅈ: '[자-짛]',
  ㅉ: '[짜-찧]',
  ㅊ: '[차-칳]',
  ㅋ: '[카-킿]',
  ㅌ: '[타-팋]',
  ㅍ: '[파-핗]',
  ㅎ: '[하-힣]',
} as const;

/**
 * 검색어에서 자음/모음만 있는 부분을 정규식 패턴으로 변환합니다.
 * 예: '꿈ㅇ' -> '꿈[아-잏]'
 */
export const convertToRegexPattern = (keyword: string): string => {
  let pattern = keyword;
  // 자음 매핑
  for (const [consonant, range] of Object.entries(consonantMap)) {
    pattern = pattern.replace(new RegExp(consonant, 'g'), range);
  }
  // 모음 매핑
  for (const [vowel, range] of Object.entries(vowelMap)) {
    pattern = pattern.replace(new RegExp(vowel, 'g'), range);
  }
  return pattern;
};

/**
 * 검색어를 전처리합니다.
 */
export const preprocessKeyword = (keyword: string) => {
  const processedKeyword = keyword.replace(/\s+/g, '');
  return {
    likeKeyword: `%${keyword}%`,
    processedLikeKeyword: `%${processedKeyword}%`,
    regexPattern: convertToRegexPattern(processedKeyword),
  };
};

/**
 * QueryBuilder에 한글 검색 조건을 추가합니다.
 */
export const addKoreanSearchCondition = (
  queryBuilder: WhereExpressionBuilder,
  fieldName: string,
  keyword: string,
  paramPrefix = '',
) => {
  const { likeKeyword, processedLikeKeyword, regexPattern } =
    preprocessKeyword(keyword);

  const uniquePrefix = paramPrefix || Math.random().toString(36).substring(7);

  return queryBuilder
    .orWhere(`REPLACE(${fieldName}, ' ', '') LIKE :${uniquePrefix}Processed`, {
      [`${uniquePrefix}Processed`]: processedLikeKeyword,
    })
    .orWhere(`${fieldName} LIKE :${uniquePrefix}Like`, {
      [`${uniquePrefix}Like`]: likeKeyword,
    })
    .orWhere(`${fieldName} REGEXP :${uniquePrefix}Regex`, {
      [`${uniquePrefix}Regex`]: regexPattern,
    });
};
