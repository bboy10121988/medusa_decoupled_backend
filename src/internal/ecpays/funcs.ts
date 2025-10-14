import { createHash } from 'crypto';


function createCheckMac(queries: URLSearchParams, hashKey: string, hashIV: string): string{
    
    let originParam = queries;
    
    // step1. 將傳遞參數依照第一個英文字母，由A到Z的順序來排序(遇到第一個英文字母相同時，以第二個英文字母來比較，以此類推)，並且以&方式將所有參數串連。
    // step2. 參數最前面加上HashKey、最後面加上HashIV
    // step3. 將整串字串進行URL encode
    // step4. 轉為小寫
    // step5. 以SHA256加密方式來產生雜凑值
    // step6. 再轉大寫產生CheckMacValue
        
    const params: Record<string, string> = {};
    for (const [key, value] of originParam.entries()) {
        params[key] = value;
    }
    
    // 排序參數
    const sortedKeys = Object.keys(params).sort();
    const sortedParams = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    
    // 加上 HashKey 和 HashIV
    const rawString = `HashKey=${hashKey}&${sortedParams}&HashIV=${hashIV}`;
    
    // URL encode
    const urlEncoded = encodeURIComponent(rawString)
        .replace(/%20/g, '+')
        .replace(/%21/g, '!')
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')
        .replace(/%2A/g, '*')
        .replace(/%2D/g, '-')
        .replace(/%2E/g, '.')
        .replace(/%5F/g, '_');
    
    // 轉小寫
    const lowerCase = urlEncoded.toLowerCase();

    // SHA256 加密
    const hash = createHash('sha256').update(lowerCase).digest('hex');

    // 轉大寫
    return hash.toUpperCase();
}

export {createCheckMac}