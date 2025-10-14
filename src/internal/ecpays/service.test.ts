const { describe, it, expect } = require('@jest/globals');
import Service from './service';


describe('ECPay Service', () => {
    console.log("123")
    it('should return correct response', async ()  => {

        const service: Service = new Service(
            'testMerchantID',
            'http://localhost:8080',
            'testHashKey',
            'testHashIV'
        );

        const response = await service.getCreditDetail({
            CreditCheckCode:12345678,
            CreditRefundId: 87654321,
            CreditAmount: 1000
        });

        describe('Response Structure', ()=>{
            console.log(response);
            console.log(response.RtnValue.close_data);
        })

        
        
    });
});