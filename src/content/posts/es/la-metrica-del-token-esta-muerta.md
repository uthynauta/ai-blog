---
author: Uthynauta
pubDatetime: 2026-09-06T18:45:00-06:00
title: La métrica del token está muerta
slug: es/la-metrica-del-token-esta-muerta
featured: true
draft: false
language: es
translationKey: token-metric-is-dead
tags:
  - llm
  - inference
  - reasoning
  - ai-engineering
description: Tokens are still useful for billing and I/O. But as reasoning moves behind opaque summaries — and increasingly into latent computation — they may be becoming a terrible proxy for how much work a model actually did.
---

# La métrica del token está muerta

Llevo tiempo siguiendo la evolución de la forma en que estimamos el trabajo que realiza un LLM y me queda cada vez más claro que la métrica del token no solo puede ser engañosa, sino que quizá nunca representó una unidad de ingeniería que trascendiera el cambio en los mismos.

Su utilidad como medida del trabajo realizado por un modelo depende, en buena parte, de una propiedad que estamos empezando a dejar atrás: que una parte importante del proceso computacional del modelo se manifieste mediante la generación y procesamiento secuencial de tokens.

El token pudo haber sido una métrica particularmente útil cuando los modelos autorregresivos eran, en esencia, máquinas de generación de texto. Modelos cuya operación fundamental consistía en predecir iterativamente el siguiente token.

Mientras el trabajo computacional y el avance a través de una secuencia de tokens permanecieran fuertemente relacionados, contar tokens era una aproximación razonable del trabajo realizado.

Pero esa relación empezó a complicarse con la aparición de los modelos de razonamiento.

## Cuando más tokens dejaron de significar mejor razonamiento

Empezamos a ver problemas en la forma de contabilizar el esfuerzo computacional prácticamente desde el momento en que el concepto de "razonamiento" apareció en el tablero.

Pronto se volvió evidente algo: la cantidad de tokens generados durante un proceso de razonamiento no refleja necesariamente la calidad del proceso que nos lleva de los _input tokens_ a los [_output tokens_](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count).

De hecho, entre quienes utilizamos habitualmente modelos _frontier_ se ha vuelto casi una regla práctica evitar niveles máximos de esfuerzo de razonamiento, a no ser que la tarea realmente los justifique.

Más razonamiento explícito, o [_reasoning tokens_](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count), no implica necesariamente una mejor respuesta.

Dependiendo del modelo y de la tarea, aumentar indiscriminadamente el esfuerzo puede añadir [latencia, costo](https://platform.claude.com/docs/en/build-with-claude/extended-thinking), redundancia y sobreverificación sin producir una mejora equivalente en la calidad del resultado.

Esto debe evaluarse caso por caso, pero una buena regla práctica sigue siendo utilizar niveles de esfuerzo más conservadores para la mayoría de los casos de uso y aumentarlos cuando la complejidad de la tarea realmente lo justifique.

El problema es que incluso esa relación entre razonamiento y tokens se ha vuelto cada vez más difícil de observar.

## El razonamiento que dejamos de ver

Los principales proveedores de modelos _frontier_ han ido dejando de exponer la copia cruda o literal del [_chain of thought_](https://openai.com/index/learning-to-reason-with-llms/) (CoT) de sus modelos.

Lo que el usuario o desarrollador recibe es cada vez más una representación parcial, [resumida](https://openai.com/index/new-tools-and-features-in-the-responses-api/) o incluso [cifrada](https://ai.google.dev/gemini-api/docs/thought-signatures) del razonamiento interno.

Las razones ofrecidas por los laboratorios proveedores de los modelos LLM son entendibles y, en muchos casos, defendibles. Entre ellos están proteger ventajas competitivas, dificultar procesos de extracción o destilación, mejorar la experiencia del usuario y preservar mecanismos internos de monitorización y seguridad.

Pero hay una consecuencia que me parece mucho más interesante desde el punto de vista de ingeniería. Dejamos de poder observar directamente aquello que estamos utilizando para representar el "esfuerzo de razonamiento".

Y entonces aparece una pregunta incómoda.

¿Y si además de haber dejado de mostrar el razonamiento, los tokens estuvieran empezando a dejar de representar una parte importante de la computación que ocurre durante ese razonamiento?

## Pensar sin palabras

De forma curiosamente paralela comenzó a aparecer una tendencia en la literatura científica: ampliar el proceso de razonamiento más allá de una secuencia de tokens que "representa" la ruta de pensamiento del modelo y permitir que parte del proceso ocurra directamente sobre sus representaciones internas.

Uno de los trabajos que primero llamó mi atención fue [**Coconut — Chain of Continuous Thought**](https://arxiv.org/abs/2412.06769).

La idea es particularmente interesante.

En lugar de decodificar necesariamente un estado interno del modelo para convertirlo inmediatamente en una palabra o token, ese estado puede reutilizarse para continuar el proceso computacional.

El modelo ya no necesita verbalizar cada paso intermedio para poder continuar "pensando".

Coconut, por supuesto, no apareció de la nada.

Ya existían trabajos como [**Think Before You Speak: Training Language Models With Pause Tokens**](https://arxiv.org/abs/2310.02226), que exploraban qué ocurría si permitíamos al modelo realizar computación adicional antes de producir el siguiente token observable.

Después apareció [**Quiet-STaR**](https://arxiv.org/abs/2403.09629), explorando mecanismos mediante los cuales los modelos pudieran aprender a "pensar antes de hablar".

Y posteriormente han aparecido trabajos sobre [_latent thoughts_](https://arxiv.org/abs/2502.17416), [_looped transformers_](https://arxiv.org/abs/2606.31779) y [_recurrent depth_](https://arxiv.org/abs/2609.01117), donde las mismas capas pueden reutilizarse iterativamente.

Poco a poco, la idea dejó de parecer solamente novedosa, y pasó a convertirse en una rama de investigación académica formal. Por lo que dicha idea empezó a parecer útil, implementable y plausible.

Y aquí aparece el problema que me interesa.

## Un token nunca fue solamente un pedazo de palabra

Para muchos usuarios habituales de modelos _frontier_, el token parece simplemente una forma rebuscada de partir palabras y texto para poder facturarnos el uso del modelo, o mejor dicho, de la infraestructura necesaria para operar el modelo como servicio.

Pero dentro de la arquitectura de estos modelos ocurre algo bastante más interesante.

Cada token se transforma en una representación vectorial que, capa tras capa, incorpora información contextual mediante los mecanismos de atención que dieron origen a la [arquitectura Transformer](https://arxiv.org/abs/1706.03762).

Es decir, el token que introducimos al modelo termina representado dentro de un espacio multidimensional muchísimo más rico que el vocabulario discreto del que salió.

Ahí cada posición contiene información no solamente sobre aquello que representa originalmente, sino sobre las relaciones que mantiene con el resto del contexto.

Cuando entendemos esto, entendemos también por qué el token había sido hasta ahora una unidad tan conveniente para medir y facturar el uso de modelos basados en transformers.

De forma extremadamente simplificada, podíamos imaginar algo así:

**1 token procesado → 1 posición en la secuencia → 1 unidad equivalente de trabajo**

No es una equivalencia matemática y el costo real depende, entre otras cosas, de la longitud de la secuencia, el KV-cache, la arquitectura y el hardware. Pero como aproximación de ingeniería funcionaba bastante bien.

Hasta que dejamos de avanzar solamente mediante tokens.

## Cuando aparece un loop

El problema empieza cuando la cantidad de procesamiento que ocurre entre dos tokens observables deja de ser aproximadamente constante.

Si aprovechamos las representaciones internas del modelo, podemos realizar múltiples transformaciones antes de producir el siguiente token.

Entonces dejamos de tener conceptualmente algo parecido a:

**1 token observable → 1 unidad equivalente de trabajo**

y podemos empezar a tener:

**1 output token → N transformaciones internas → N unidades adicionales de cómputo → 1 token observable**

La cantidad de tokens y la cantidad de procesamiento comienzan entonces a desacoplarse.

Cuando un arquitecto de LLM decide realizar múltiples pasos sobre representaciones internas antes de emitir el siguiente token, ese token deja de representar fielmente la cantidad de trabajo computacional que pretendíamos aproximar con él.

No estoy diciendo que el token jamás haya sido útil como unidad de medida. Pero es evidente que nuestro amado token que había sido tan utilizado empieza a presentar desventajas.

Una vez que pasamos de modelos cuyo procesamiento, generación y "pensamiento" estaban fuertemente ligados a una secuencia observable de tokens, y agregamos _loops_ internos, es necesario contabilizar también esos ciclos si realmente queremos medir la cantidad de esfuerzo computacional necesario para llegar a un resultado.

Es como realizar una multiplicación a mano y afirmar después que la resolví en un solo paso porque solamente escribí una vez el resultado final.

Para llegar ahí quizá tuve que realizar varias multiplicaciones dígito por dígito, almacenar resultados intermedios y efectuar posteriormente una suma.

No dudo que haya personas capaces de resolverlo mentalmente de una sola vez.

Yo no.

Y sería tramposo afirmar que mi proceso requirió un solo paso simplemente porque solo hice visible el resultado.

## Y entonces apareció Astra

Hasta aquí podríamos considerar todo esto una discusión fundamentalmente académica. Y que modelos con procesamiento de estados internos existían exclusivamente en la literatura científica como ejercicios de innovación.

Tenemos ya papers, arquitecturas experimentales y algunas ideas particularmente interesantes sobre razonamiento latente.

Sin embargo en los días previos al lanzamiento de GPT-6 Astra comenzaron a aparecer reportes que apuntaban precisamente en esta dirección.

[_The Information_](https://www.theinformation.com/articles/secret-technique-behind-openais-astra-model-sparks-security-concerns), citando a una persona con conocimiento del desarrollo del modelo, reportó que Astra utiliza una técnica conocida como _recurrent depth_ o _looped transformer_, que permite que determinadas representaciones sean procesadas repetidamente antes de producir la salida observable.

El reporte añadía algo todavía más interesante: OpenAI habría limitado deliberadamente el uso de esta técnica para conservar suficiente _chain of thought_ legible como para poder monitorizar el comportamiento del modelo. Pero, de acuerdo al reporte, al menos un porcentaje del razonamiento realizado por el modelo se estaría realizando en el espacio de representacion previamente descrito antes de producir un token, o bien, verbalizar el razonamiento, y este habría tenido que controlarse para mantener cierto grado de fiabilidad respecto al proceso real de razonamiento.

[Otros medios](https://www.theverge.com/ai-artificial-intelligence/988334/openai-astra-ai-monitoring-safety) retomaron posteriormente el reporte y la discusión sobre las implicaciones de _recurrent depth_ para la observabilidad del razonamiento.

¿Significa esto que sabemos que Astra utiliza extensivamente _recurrent depth_? OpenAI no lo ha desmentido ni admitido. Hasta donde sabemos públicamente, OpenAI no ha publicado una descripción arquitectónica suficientemente detallada que permita comprobar de manera independiente esta sospecha. Pero resulta interesante para nuestro análisis.

Retomemos.

La posibilidad de desacoplar la cantidad de cómputo interno de la cantidad de tokens observables existe en la literatura científica.

Existen implementaciones experimentales.

Existen trabajos sobre _looped transformers_ y _recurrent depth_.

Y ahora existen también reportes que atribuyen una arquitectura de este tipo a uno de los modelos _frontier_ más recientes y con mejor desempeño en los benchmarks.

No sabemos todavía hasta qué punto todas estas piezas están conectadas.

Pero me parece razonable empezar a hacer la pregunta.

Tal vez no estamos viendo solamente modelos que aprendieron a pensar con menos tokens.

**Tal vez estamos empezando a ver modelos capaces de esconder más la cantidad de cómputo que realizan.**

## Entonces, ¿qué estamos midiendo en los benchmarks?

Aquí es donde esta discusión empieza a tener consecuencias prácticas.

Nos sorprendemos porque un modelo logra resolver determinado benchmark utilizando cierta cantidad de _output tokens_. Y OpenAI fue muy específico en reportar [_output tokens_](https://openai.com/index/path-to-astra/)
.
Los benchmarks nos ayudan a comparar modelos bajo condiciones conocidas. Comparamos modelos. Comparamos costos. Comparamos cantidades de tokens.

Incluso construimos curvas que intentan representar cuánto "razonamiento" necesitamos para alcanzar determinado nivel de desempeño. Y solemos asociar también la cantidad de tokens utilizados con la capacidad del modelo, y para muchas personas aún más interesante, nos da una estimación de la factura que pagaremos por ejecutar una tarea.

Pero rara vez nos preguntamos si el modelo, para llegar a expresar cada uno de esos tokens, realizó más pasos internos.

Si entre dos tokens observables un modelo pudo ejecutar una, dos, cinco o N iteraciones internas, comparar simplemente el número de tokens deja de ser una comparación de cantidades equivalentes.

Un modelo que produce 500 tokens después de 500 unidades hipotéticas de trabajo computacional no necesariamente hizo el mismo trabajo que otro que produce 500 tokens después de miles de transformaciones internas.

Los dos escribieron 500 tokens. Pero eso no significa necesariamente que utilizaron la misma cantidad de cómputo para producirlos.

Y existe además otro indicio particularmente interesante.

Un preprint publicado en julio de 2026, [**Not All LLM Reasoning is Visible in the Chain-of-Thought**](https://arxiv.org/abs/2607.22925), estudió 13 modelos _frontier_ utilizando tareas sintéticas y encontró que varios podían beneficiarse de tokens de relleno semánticamente irrelevantes, con mejoras de desempeño de hasta 13 puntos porcentuales en algunos experimentos.

El resultado no demuestra que Astra utilice _recurrent depth_. Tampoco demuestra cuál es el mecanismo interno responsable del fenómeno. Pero para el argumento que estoy planteando aquí ni siquiera necesito llegar tan lejos.

Lo interesante es algo mucho más sencillo:

existe evidencia experimental que sugiere que la cantidad y el contenido semántico de los tokens que podemos observar no necesariamente describen toda la computación útil que ocurre mientras el modelo llega a una respuesta.

Y si siquiera aceptamos esa posibilidad, contar tokens y medir razonamiento empiezan a convertirse en dos cosas distintas.

## El problema no termina en los benchmarks

Hasta ahora he hablado principalmente del problema desde el punto de vista técnico.

Pero hay un segundo problema.

Alguien tiene que pagar por todo ese cómputo.

En 2025, investigadores de la University of Maryland publicaron un preprint llamado [**CoIn — Counting the Invisible Reasoning Tokens in Commercial Opaque LLM APIs**](https://arxiv.org/abs/2505.13778).

El trabajo parte de una situación bastante peculiar que ya existe en las APIs comerciales de modelos de razonamiento:

podemos ser facturados por [tokens de razonamiento cuyo contenido no podemos observar](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count).

Los autores llevan esa preocupación hasta una posibilidad todavía más incómoda: si el cliente no puede observar esos tokens, tampoco puede verificar independientemente que la cantidad reportada por el proveedor corresponda exactamente con aquello que ocurrió.

Incluso plantean el concepto de _token count inflation_ y proponen un mecanismo de auditoría para verificar la cantidad y validez semántica de esos tokens ocultos.

CoIn es un preprint, no una publicación que debamos presentar como consenso académico establecido.

Pero su existencia me parece relevante por una razón diferente:

alguien ya consideró que la opacidad de los _reasoning tokens_ facturados por APIs comerciales era un problema suficientemente interesante como para intentar construir un mecanismo técnico de auditoría.

Y entonces terminamos con dos problemas diferentes que empiezan a converger.

Por un lado podemos tener:

**tokens de razonamiento que pagamos pero no podemos observar.**

Y por otro podemos tener:

**cómputo o razonamiento que ocurre pero cuya magnitud no necesariamente queda representada por la cantidad de tokens que observamos.**

En ambos casos aparece exactamente la misma pregunta:

**¿qué demonios estamos midiendo cuando decimos que un modelo utilizó X tokens para resolver una tarea?**

## El token no está muerto. La métrica sí.

El token obviamente no está muerto. Sigue siendo una unidad extremadamente útil para representar entradas y salidas. Es un paso necesario para llegar al hermoso embedding, o representación vectorial en el espacio latente.

Sigue siendo fundamental para entender ventanas de contexto.

Sigue teniendo implicaciones directas sobre memoria, KV-cache, throughput y muchas otras propiedades de un sistema de inferencia.

Y probablemente seguiremos pagando APIs utilizando alguna variante de esta unidad durante bastante tiempo.

Lo que creo que está muriendo es otra cosa:

**la idea de que el número de tokens constituye por sí solo un proxy suficientemente bueno de cuánto trabajo hizo un modelo.**

Y esa distinción importa.

Porque utilizamos esa métrica para comparar modelos. Para comparar benchmarks. Para calcular costos. Para diseñar sistemas. Para decidir qué modelo debe resolver determinada tarea. Para construir estrategias de _routing_.

Y finalmente para intentar responder una pregunta aparentemente sencilla:

¿cuánto cómputo necesito para resolver este problema?

## Un problema de metrología

En metrología, cuando la variable utilizada para aproximar un fenómeno deja de representar fielmente aquello que queremos medir, tenemos que reconsiderar la forma de medirlo.

Eso no significa que la medida anterior haya sido inútil.

Tampoco significa que nunca haya representado razonablemente aquello que queríamos observar.

Significa simplemente que el sistema cambió.

No podemos seguir midiendo de la misma manera procesos que incorporan _loops_ internos, reintentos, pasos adicionales o cualquier otra forma de cómputo que deje de manifestarse directamente en la variable que estamos contando.

La fricción que noto ahora es que usuarios, laboratorios, investigadores, empresas, CTOs/CFOs y todo el largo etcétera que integra el ecosistema actual de la IA estamos demasiado acostumbrados al token.

Hemos desarrollado una intuición alrededor de él.

Es parecido a cambiar de marcos o pesetas a euros.

Casi como cuando calculamos mentalmente cuánto nos va a costar el carrito del supermercado antes de llegar a la caja.

Sabemos aproximadamente qué significan "100 mil tokens". Sabemos aproximadamente cuánto puede costar determinado contexto. Sabemos aproximadamente cuánto debería consumir cierta tarea.

El token se convirtió en una unidad intuitiva. Y desprendernos de una unidad intuitiva siempre genera fricción.

Pero si realmente queremos representar fielmente esa cantidad que empíricamente llamamos "esfuerzo de razonamiento", quizá necesitemos empezar a pensar en otras medidas.

Porque, seamos honestos, tampoco es como si los laboratorios _frontier_ fueran a regalarnos tiempo de GPU o energía eléctrica.

El cómputo puede desaparecer de nuestra vista. No puede desaparecer de los fierros.

Puede ser útil para presentar determinado benchmark bajo una luz favorable, pero en producción ese cómputo termina existiendo en algún lado.

Se manifiesta como ocupación de aceleradores, latencia, consumo energético e infraestructura.

Y tarde o temprano ese costo termina trasladándose a las facturas de las APIs y finalmente a los productos que todos consumimos.

Por eso quizá deberíamos ponernos de acuerdo sobre qué estamos midiendo antes de acostumbrarnos a pagar de forma opaca por "reasoning tokens" que ni siquiera podemos observar.

Porque contar tokens y medir cómputo fueron durante algún tiempo aproximaciones suficientemente cercanas como para que pudiéramos tratarlas casi como la misma cosa.

Puede que ya no lo sean.

Y si el cómputo real empieza a esconderse entre los tokens, seguir contando solamente los tokens no va a pagar la factura energética ni la infraestructura necesaria para llegar a ellos.
