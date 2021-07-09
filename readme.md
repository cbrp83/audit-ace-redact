# Audit Redact

Este código fuente es utilizado para 2 fines:
1. Para ofuscar y extraer campos de un API Connect log Record, mediante un global policy
2. Para ofuscar y extraer campos de un ACE Monitoring event, mediante un servicio standalone

El código es JavaScript, basado en NodeJS. La traducción de "redact" es ofuscar.

La configuración consiste en dos elementos dentro de un mismo json:
* Cuales campos se deben ofuscar
* Cuales campos se deben extraer para ser enviados al log de auditoría, y cual nombre deben tener.

El funcionamiento a alto nivel es el siguiente:

1. Se obtiene el input original (API Connect log Record, ACE Monitoring Event)
2. Se crea un "input record" a partir del original, con los campos obfuscados según la configuración, que tiene:
2.1 Redacted request
2.2 Redacted response object. Este es un objeto con campos. ej. .movements.currency
2.3 Redacted response string. Este es un texto. ej. '{"currency": "604"}'
3. Se extraen los campos especificados en la configuración.

Ejemplo configuración:
```
{
    "redact": {
        "anywhere": {
            "full": ["currency", "description", "customerCode", "Authorization"],
            "cc": ["ccNum"]
        },
        "path": {
            "full": ["data.movements.movementBranch"],
            "cc": ["data.movements.movementPostDate"]
        }
    },
    "extract": {
        "@branchId": "redacted.request_obj.Parameters.branchCode",
        "@currency": "redacted.request_obj.Parameters.currency",
        "@message": "redacted.response"
    }
}
```

Ejemplo api connect record:
```
{
    ...
    "_source": {
        ...
        "response_body": "{\"status\":{\"code\":\"0000\",\"desc\":\"Respuesta exitosa\"},\"data\":{\"customerCode\":\"000060052568\"...",
        ...
    },
    ...
}
```

Ejemplo salida ofuscada:
```
    “ibkrec": {
      ...
      "@message": "{\"status\":{\"code\":\"0000\",\"desc\":\"Respuesta exitosa\"},\"data\":{\"customerCode\":\"************\"...",
    } 
```

## Específico a ACE 
El archivo [server.js](server.js) inicia un servicio que:
*  Se conecta a la cola MQ especificada
*  Convierte el monitoring event xml a json
*  Ejecuta los pasos mencionados arriba

El archivo [Dockerfile](Dockerfile) tiene los comandos para crear un container que ejecuta el server.js. Todos los datos provienen ConfigMaps o Secrets, asignados como variables de ambiente o como mount, en el caso de config/config.json.

## Específico a API Connect
El archivo [dummy/global-policy-sample.yaml](dummy/global-policy-sample.yaml) tiene un ejemplo de un global policy que aplica el redact. Ese archivo contiene:
* Un objeto config
* Un bloque de código con llamada a librería ibkredact
* Un copy paste de la librería ibkredact, tomado de [ibk-redact-utils.js](ibk-redact-utils.js)

En lugar de copy paste, se pudo usar un "require(ibk-redact-utils.js)", pero para eso hace falta un upload al filesystem de DataPower, que es un paso que no se realizó.

Ejemplo de comando para hacer deploy de un global policy:
```
apic global-policies:create --scope catalog -c sandbox -o ibk-dev -s https://apic-sbx-mgmt-api-manager-apic.apps.ocpsbx.grupoib.local --configured-gateway-service api-gateway-service global-policy-sample.yaml
```

Un global policy no tiene efecto hasta que no se agregue a un hook. Ejemplo de comandos para asociar el policy a un posthook:
```
# Esto crea un archivo con el id del policy
apic global-policy-posthooks:create --scope catalog -c sandbox -o ibk-dev -s https://apic-sbx-mgmt-api-manager-apic.apps.ocpsbx.grupoib.local --configured-gateway-service api-gateway-service GlobalPolicy.yaml
# En el archivo resultante, se hace find replace de "url"  por "global_policy_url". Luego se ejecuta el "crear posthook"
apic global-policy-posthooks:create --scope catalog -c sandbox -o ibk-dev -s https://apic-sbx-mgmt-api-manager-apic.apps.ocpsbx.grupoib.local --configured-gateway-service api-gateway-service GlobalPolicy.yaml
```

Ejemplo de comando para des-asociar el policy de un hook. Este comando no elimina el policy, solo lo des-asocia.
```
apic global-policy-posthooks:delete  --scope catalog  -c sandbox -o ibk-dev -s https://apic-sbx-mgmt-api-manager-apic.apps.ocpsbx.grupoib.local --configured-gateway-service api-gateway-service  
```

## FAQ
**Por qué se utilizó JavaScript, no Java ni un flujo ACE para el elemento que procesa monitoring events?**
La implementación de ofuscación hacía falta en ACE y en API Connect, en API Connect sólo se puede trabajar en JavaScript. No tenía sentido repetir la implementación para ACE en otro lenguaje, hubiera resultado en la necesidad de desarrollar, probar y mantener dos versiones en lenguajes diferentes.

**Por qué no se utilizó el policy redact que viene de fábrica en API Connect?**
El redact de fábrica:
* No soporta el requerimiento de ofuscar solo parte de la tarjeta de crédito, ni otros tipos de ofuscación diferentes a "cambiar todo por un *".
* No se puede utilizar fuera de API Connect, y hacía falta para ACE también

**Por que no se hizo el ofuscamiento fuera de API Connect, ej en logstash?**
* La única modificación que la documentación del producto menciona como válida en el logstash de fábrica es la de agregar un offload. Y el offload no resulta en que el analytics quede ofuscado.
* Hacerlo en un el logstash del offload tampoco resulta en que el analytics quede ofuscado.
* Se siguió el esquema del redact de fábrica, que se ejecuta como un policy.

**Se puede manejar auditoría de diferentes monitoring events?**
En la implementación actual (mayo 2021) no. Pero es un cambio menor hacer lo siguiente:

* Modificar el monitoring profile para capturar en varios puntos
* Modificar el desarrollo para que maneje varios eventNames y los procese todos

**Se puede manejar auditoría de monitoring event de un HTTP POST?**
Hace falta:
* Un monitoring profile que capture el HTTP Request.out
* Cambio en código para generar input de ese evento.

**Como se ejecutan las pruebas unitarias automatizadas?**
De la manera estándar en NodeJS, con npm test