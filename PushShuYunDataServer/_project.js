module.exports={
  "MainDescribe": "数据转发服务",
  "Schedule": require('./config').Schedule.value,
  "ShowLOG":require('./config').ShowLOG.value,
  "GroupSet": {
      "MSS-ONLY": {
        "Base-URL": "http://100.114.29.200:8085"
      },
      "MSS-JACKJONES": {
        "Base-URL": "http://100.114.29.200:8086"
      },
      "MSS-VEROMODA": {
        "Base-URL": "http://100.114.29.200:8087"
      },
      "MSS-SELECTED": {
        "Base-URL": "http://100.114.29.200:8088"
      },
      "MSS-JLINDEBERG": {
        "Base-URL": "http://100.114.29.200:8089"
      },
      "H5-ONLY": {
        "Base-URL": "http://100.114.29.133:8080"
      },
      "H5-JACKJONES": {
          "Base-URL": "http://100.114.32.193:8081"
      },
      "H5-VEROMODA": {
          "Base-URL": "http://100.114.29.133:8082"
      },
      "H5-SELECTED": {
          "Base-URL": "http://100.114.32.193:8083"
      },
      "H5-JLINDEBERG": {
          "Base-URL": "http://100.114.32.193:8084"
      },
      "SHUYUN-ALL": {
        "Base-URL": "http://10.44.54.91:7780/guide-open-api/1.0"
      },
      "CRM-ALL": {
        "Base-URL": "http://10.44.54.91:7777/eai_chs/start.swe?SWEExtSource=WebService&SWEExtCmd=Execute&WSSOAP=1;&UserName=EAIUSER&Password=EAICrm234"
      },
      "SHUYUN-REAL": {
          "Base-URL": "http://guideshopping.sh-dev.shuyun.com/guide-open-api/1.0"
      },
      "GUIDE-TEST": {
          "Base-URL": "http://123.57.214.43:28086"
      }

  },
  "ProxyTasks": [
    {
      "Name": "PushGoods2ShuYun",
      "Inbound": {
        "Group": ["MSS-ONLY","MSS-JACKJONES","MSS-VEROMODA","MSS-SELECTED","MSS-JLINDEBERG"],
        "URI": "/lzsz-MSSGoods-1.0/crm/goods",
        "Method": "GET",
        "Content-Type": "application/json",
        "Params": {},
        "Status-Field":"status",
        "Status-Code":"200",
        "Data-Point": "data"
      },
      "Outbound": {
        "Group": "SHUYUN-ALL",
        "URI": "/goods",
        "Method": "POST",
        "Content-Type": "application/json",
        "Basic-Auth": {
          "Username": "shuyun",
          "Password": "shuyun123"
        }
      },
      "Describe": "从JAVA拉取上架商品主数据推送数云系统"
    }
    ,
    {
      "Name": "PushClassify2ShuYun",
      "Inbound": {
        "Group": ["MSS-ONLY","MSS-JACKJONES","MSS-VEROMODA","MSS-SELECTED","MSS-JLINDEBERG"],
        "URI": "/lzsz-MSSGoods-1.0/crm/categorys",
        "Method": "GET",
        "Content-Type": "application/json",
        "Params": {},
        "Status-Field":"status",
        "Status-Code":"200",
        "Data-Point": "data"
      },
      "Outbound": {
        "Group": "SHUYUN-ALL",
        "URI": "/goods/categorys",
        "Method": "POST",
        "Content-Type": "application/json",
        "Basic-Auth": {
          "Username": "shuyun",
          "Password": "shuyun123"
        }
      },
      "Describe": "从JAVA拉取商品分类数据推送数云系统"
    },
    {
      "Name": "PushMemberGuide2ShuYun",
      "Inbound": {
        "Group": ["H5-ONLY","H5-JACKJONES","H5-VEROMODA","H5-SELECTED","H5-JLINDEBERG"],
        "URI": "/lzsz-DGBUser-1.0/memberInfo/pushMemberInfo",
        "Method": "GET",
        "Content-Type": "application/json",
        "Params": {},
        "Status-Field":"status",
        "Status-Code":"200",
        "Data-Point": "data"
      },
      "Outbound": {
        "Group": "SHUYUN-ALL",
        "URI": "/guideAndMembers/guides",
        "Method": "POST",
        "Content-Type": "application/json",
        "Basic-Auth": {
          "Username": "shuyun",
          "Password": "shuyun123"
        }
      },
      "Describe": "推送H5导购会员绑定关系数据-数云"
    }
    ,
    {
      "Name": "PushMemberGuide2CRM",
      "Inbound": {
        "Group": ["H5-ONLY","H5-JACKJONES","H5-VEROMODA","H5-SELECTED","H5-JLINDEBERG"],
        "URI": "/lzsz-DGBUser-1.0/memberInfo/pushMemberInfo",
        "Method": "GET",
        "Content-Type": "application/json",
        "Params": {},
        "Status-Field":"status",
        "Status-Code":"200",
        "Data-Point": "data"
      },
      "Outbound": {
        "Group": "CRM-ALL",
        "URI": "",
        "Method": "POST",
        "preParseFunction":"preParse.parseGuideMemMsg2CRM",
        "setHeadersFunction":"setHeaders.CRMheaders",
        "Content-Type": "text/xml",
        "Basic-Auth": {}
      },
      "Describe": "推送H5导购会员绑定关系数据-CRM"
    }
  ]
};



