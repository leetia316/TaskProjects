module.exports = function (dataBlock, ProxyTask) {

    var xml = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bss="http://siebel.com/loyalty/BSShuYunGuideSystemWS" xmlns:bs="http://www.siebel.com/xml/BS%20ShuYun%20Guide%20Mem%20IO">'
        + '<soapenv:Header/>'
        + '<soapenv:Body>'
        + '<bss:GetGuideMemMsg>'
        + '<SiebelMessage>'
        + '<bs:ListOfGuideMemInfo>'
        + '<!--Zero or more repetitions:-->';

        for(var i=0,guideInfo;guideInfo=dataBlock[i++];){
            xml += '<bs:List><bs:guideId>'+guideInfo["guideId"]+'</bs:guideId><bs:memberId>'+guideInfo["memberId"]+'</bs:memberId><bs:memberOpenId>'+guideInfo["memberOpenId"]+'</bs:memberOpenId><bs:brandcode>'+guideInfo["brandcode"]+'</bs:brandcode></bs:List>'
        }

    xml += '</bs:ListOfGuideMemInfo>'
        + '</SiebelMessage>'
        + '</bss:GetGuideMemMsg>'
        + '</soapenv:Body>'
        + '</soapenv:Envelope>';

    return xml;

};