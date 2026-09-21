---
author: Uthynauta
pubDatetime: 2026-09-20T20:26:54-06:00
title: "El tigre y la jaula: por qué la alineación debe ir más allá del modelo"
slug: es/el-tigre-y-la-jaula
draft: false
language: es
translationKey: the-tiger-and-the-cage
tags:
  - ai-engineering
  - alignment
  - agentic-ai
  - ai-safety
description: "La cadena de razonamiento no basta para verificar la alineación de un sistema de IA. Una propuesta de ingeniería que combina representaciones, evaluación, autoridad humana y contención."
---
# El tigre y la jaula

## TL;DR

La alineación de la IA no puede depender únicamente de las instrucciones del modelo ni de observar su cadena de razonamiento (CoT). A medida que los agentes adquieren autonomía, utilizan herramientas y modifican su entorno, necesitamos verificar que respeten los límites de autoridad incluso cuando cambian las instrucciones, el contexto o sus capacidades. Esto exige trabajar en cuatro frentes: representaciones internas, evaluación conductual, orquestación de agentes e infraestructura de contención. No basta con enseñar al tigre a respetar la jaula: también debemos asegurarnos de que la jaula funcione cuando decida cruzar sus límites.

## Por qué la alineación debe ir más allá del modelo

En [*The Token Metric Is Dead*](https://uthynauta.dev/posts/the-token-metric-is-dead/) planteé un problema de medición: contar tokens sigue siendo útil para describir entradas, salidas y facturación, pero ya no basta, por sí solo, para estimar cuánto cómputo requirió una tarea. Los modelos pueden emplear recursos y procesos internos cuya relación con los tokens que observamos no es directa.

Ahora quiero explorar una consecuencia distinta de esa misma separación: **si una cadena de tokens no describe necesariamente todo el procesamiento de un modelo, ¿por qué esperaríamos que bastara para comprobar su alineación?**

La pregunta importa todavía más cuando dejamos de hablar de un modelo que responde preguntas y empezamos a hablar de un sistema que usa herramientas, ejecuta código, conserva memoria, interactúa con otros agentes y modifica su entorno. Una respuesta final correcta, o una explicación textual aparentemente impecable, no demuestra que todas las acciones que llevaron a ella hayan sido aceptables.

Mi tesis es que **la alineación debe convertirse en una propiedad verificable del sistema completo, no limitarse a sus instrucciones o a su interfaz lingüística**. Para avanzar hacia ella necesitamos trabajar tanto en las representaciones y el comportamiento del modelo como en las reglas de autorización y los límites efectivos de la infraestructura.

## 1. La observabilidad no es el razonamiento

La [cadena de razonamiento (*chain of thought*, CoT)](https://arxiv.org/abs/2201.11903) permitió que los modelos expresaran pasos intermedios en lenguaje y mejoraran su desempeño en determinadas tareas de razonamiento. Además de su utilidad para resolver problemas, esa cadena abrió una posibilidad atractiva: observar señales de lo que el modelo estaba haciendo antes de producir su respuesta.

Pero observar señales no equivale a disponer de una traza completa de ejecución. Conviene distinguir tres cosas: el procesamiento interno del modelo, la cadena de razonamiento que genera y el resumen o la explicación que recibe el usuario. Pueden estar relacionados sin ser idénticos.

En [*Reasoning models don't always say what they think*](https://www.anthropic.com/research/reasoning-models-dont-say-think), Anthropic estudió si determinados modelos reconocían, en sus cadenas de razonamiento, el uso de pistas que habían influido en sus respuestas. Con frecuencia no lo hacían. El experimento no demuestra que toda cadena sea engañosa ni permite atribuir una intención consciente al modelo; sí muestra que **una explicación en lenguaje puede omitir información causalmente relevante para la respuesta**.

No conviene confundir esa falta de fidelidad con otros comportamientos. La [adulación o complacencia excesiva hacia el usuario](https://www.anthropic.com/research/towards-understanding-sycophancy-in-language-models) puede surgir de incentivos de entrenamiento que favorecen respuestas agradables frente a respuestas correctas. La [simulación de alineación (*alignment faking*)](https://www.anthropic.com/research/alignment-faking), por su parte, se ha estudiado en escenarios experimentales específicos. Son fenómenos distintos: ninguno se demuestra simplemente porque una explicación omita un paso.

OpenAI ha encontrado otro problema. En [*Detecting misbehavior in frontier reasoning models*](https://openai.com/index/chain-of-thought-monitoring/) reportó que penalizar directamente ciertos contenidos de la cadena de razonamiento podía hacer menos visible una conducta indeseable sin eliminarla. Esto ayuda a entender una decisión de diseño que Jakub Pachocki explica en [*An Alien Mind*](https://openai.com/index/an-alien-mind/): preservar, en la medida de lo posible, el valor del CoT como señal de supervisión evitando optimizarlo directamente para que diga lo que el supervisor quiere leer.

Pachocki también advierte que la capacidad de depender de esa señal está disminuyendo: los modelos trabajan en entornos más complejos, mezclan razonamiento con comunicación y herramientas, pueden manipular mejor su propio proceso y adquieren capacidades que no requieren necesariamente razonamiento verbalizado. Su propuesta no es abandonar la supervisión del CoT, sino complementarla, entre otras posibilidades, con el **monitoreo de activaciones internas**.

Hay una distinción importante: que el CoT no sea una explicación completa no significa que carezca de utilidad. Su lectura puede revelar señales que no aparecen en las acciones finales. Pero tampoco podemos tratar una cadena de texto plano como un certificado de alineación, por muchoq ue parezca que cumple con lo que esperamos del modelo.

Por eso propongo separar dos preguntas que solemos mezclar:
1. ¿Qué podemos inferir del razonamiento verbalizado? y,
2. ¿Qué evidencia necesitamos para confiar en el comportamiento del sistema?.

La segunda es más amplia y no debería depender de una única fuente de observabilidad.

## 2. Conceptos que no caben en una instrucción

«No reveles información privada». «No ejecutes acciones sin autorización». Esas frases pueden ser instrucciones útiles, pero los conceptos que intentan representar —privacidad, consentimiento, daño, autoridad— no se reducen a una secuencia particular de palabras.

Tampoco existe una sola «moral humana» que podamos codificar sin desacuerdos. La humanidad no es un monolito de reglas sociales o morales. La alineación práctica, sin embargo, exige definir **qué objetivos, normas, obligaciones y límites** debe respetar un sistema en un contexto concreto, quién tiene autoridad para establecerlos y cómo resolver conflictos entre ellos. Una política de privacidad, por ejemplo, no es lo mismo que una preferencia del usuario; una orden técnicamente posible no es, por ello, una orden autorizada.

Más aún, no todos los modelos operan únicamente sobre las palabras como símbolos discretos. En general los modelos basados en la arquitectura Transformer, valga la redundancia. transforman entradas en representaciones numéricas internas. Y existen modelos de percepción —como [DETR](https://arxiv.org/abs/2005.12872), para detección de objetos, o [SAM](https://arxiv.org/abs/2304.02643), para segmentación— cuyo procesamiento central no consiste en producir una explicación lingüística. Esto no demuestra que compartan una única arquitectura de alineación con un modelo de lenguaje; muestra por qué sería restrictivo **suponer que toda propiedad de seguridad debe representarse o verificarse mediante texto**.

La investigación sobre [razonamiento en espacios latentes, como Coconut](https://arxiv.org/abs/2412.06769), explora formas de realizar pasos intermedios sin convertirlos en tokens de lenguaje natural. No podriamos afirmar que todos los modelos de frontera empleen estos mecanismos, sin embargo no es necesario un proceso de razonamiento o loops internos en el espacio latente para ello. [Jakub Pachocki, director científico de OpenAI](https://openai.com/index/an-alien-mind/), advierte que los modelos están desarrollando capacidades que no dependen necesariamente del razonamiento verbalizado, mientras que su observabilidad mediante cadenas de razonamiento disminuye. Esto refuerza la necesidad de investigar mecanismos de alineación que no dependan exclusivamente de la representación lingüística del razonamiento.

Hay antecedentes aún más cercanos al problema de alineación. La [ingeniería de representaciones](https://arxiv.org/abs/2310.01405) estudia cómo identificar y modificar patrones internos relacionados con fenómenos como la honestidad (concepto antropomórfico pero útil en este contexto). Los trabajos de Anthropic sobre [trazado de circuitos y conceptos compartidos entre idiomas](https://www.anthropic.com/research/tracing-thoughts-language-model) y [vectores de personalidad](https://www.anthropic.com/research/persona-vectors) exploran maneras de observar —y, bajo determinadas condiciones experimentales, intervenir— representaciones asociadas con conductas concretas.

La pregunta de ingeniería es: **¿podemos diseñar pruebas para comprobar que las propiedades relevantes de una política se mantienen cuando cambia la forma en que una tarea llega al modelo o se ejecuta?**

## 3. Alineación como invariante: de la intuición a una prueba

En ingeniería llamamos *invariante* a una propiedad que debe mantenerse bajo condiciones definidas. Si una operación requiere autorización, por ejemplo, ese requisito no debería desaparecer porque el usuario reformule la petición, cambie de idioma o entregue la misma instrucción mediante una imagen en vez de texto.

La propuesta se parece a las [pruebas metamórficas de invariancia semántica](https://doi.org/10.1109/ACCESS.2025.3646270): en vez de verificar una única entrada y una única salida, transformamos una entrada de manera controlada y comprobamos qué propiedades deberían mantenerse. Pero aquí me interesa extender esa idea desde la consistencia de las respuestas hacia el **comportamiento autorizado de un sistema que puede actuar**.

Imaginemos un agente con acceso a una base de datos de clientes. Una persona sin permisos le pide información privada; después repite la petición mediante una paráfrasis, en otro idioma y a través de una imagen con texto o mediante audio. Las entradas son distintas, pero la propiedad que esperamos conservar es la misma: el agente no debe entregar esos datos ni invocar una herramienta que permita extraerlos.

Un ejemplo público —no una demostración académica— es el trabajo de [Pliny the Liberator en X](https://x.com/elder_plinius), quien publica intentos de *jailbreak* o evasión de salvaguardas. En [uno de sus ejemplos con GPT-5.2](https://x.com/elder_plinius/status/1999253071189189114), presenta una reformulación adversarial de las instrucciones y resultados que atribuye al modelo. Su publicación permite al lector examinar una falla alegada ante una formulación concreta; no demuestra que el ataque funcione en todas las versiones ni que conozcamos el mecanismo interno que produjo la respuesta. Tampoco toda paráfrasis es un ataque: aquí se intenta cambiar deliberadamente la interpretación de las restricciones.

Precisamente por eso me parece ilustrativo: **si el límite desaparece cuando cambia el envoltorio de una solicitud, aún no podemos considerarlo una propiedad robusta del comportamiento**. Y si ese límite debe proteger datos o impedir acciones, necesitamos comprobarlo también fuera de la respuesta textual.

Podríamos escribir esa expectativa de forma esquemática:

```text
Variaciones de la misma solicitud no autorizada
                  ↓
   Misma obligación de respetar la política
                  ↓
Sin acceso ni divulgación de datos restringidos
```

La condición «misma solicitud no autorizada» importa. No esperamos respuestas idénticas ante situaciones superficialmente parecidas si cambian hechos relevantes, como la identidad del solicitante, el alcance de su permiso o la finalidad autorizada. **Lo invariante es la propiedad normativa bajo condiciones equivalentes, no la redacción de la respuesta, o la representación de entrada.**

Esa sería una primera capa de evaluación conductual. La segunda, más ambiciosa, buscaría señales internas asociadas con el reconocimiento de una restricción. ¿Existen representaciones estables —no necesariamente vectores idénticos— al presentar variantes equivalentes de un mismo caso? ¿Se relacionan causalmente con la decisión de actuar o abstenerse? ¿Qué ocurre si intervenimos sobre ellas?

Todavía hay límites importantes. Una señal interna correlacionada con una negativa no prueba que haya causado esa negativa; una representación estable tampoco garantiza una acción correcta. La evidencia interna podría **complementar**, pero no reemplazar, las pruebas de comportamiento y los controles externos.

Ésta es la hipótesis que me interesa explorar: no basta con buscar respuestas seguras ante frases conocidas; necesitamos comprobar si una política sobrevive a cambios de formulación, idioma, modalidad, contexto y duración de la tarea, y si las señales internas disponibles ayudan a explicar cuándo deja de cumplirse.

## 4. Un modelo también aprende a trabajar dentro de un entorno

Hay otra forma de observar comportamientos aprendidos que no necesariamente tienen una dimensión moral: **la adaptación de un modelo a un entorno de trabajo concreto**. Pensemos en agentes de programación como Claude Code o Codex. No basta con que el modelo sepa escribir código; debe decidir cuándo inspeccionar archivos, utilizar herramientas, ejecutar pruebas, interpretar errores, corregir una solución o solicitar intervención humana. Su desempeño depende tanto de esas decisiones como del código final.

El entrenamiento y el entorno pueden favorecer esas conductas. [OpenAI explicó que codex-1 se entrenó mediante aprendizaje por refuerzo en tareas reales de programación y diversos entornos](https://openai.com/index/introducing-codex/), con objetivos que incluían seguir instrucciones, producir cambios adecuados para revisión humana y ejecutar pruebas hasta obtener resultados satisfactorios. Por su parte, [Anthropic ha estudiado cómo incorporar herramientas a los entornos de entrenamiento puede modificar la conducta de agentes en escenarios de alineación](https://alignment.anthropic.com/2026/teaching-claude-why/).

También interviene la **orquestación o *harness***: instrucciones, herramientas, gestión del contexto, permisos y mecanismos de validación que rodean al modelo. En su trabajo sobre [ingeniería del entorno de Codex](https://openai.com/index/harness-engineering/), OpenAI explica cómo estructurar el repositorio, los controles y la retroalimentación permite al agente completar tareas que antes fallaban por un entorno insuficientemente especificado. Cambiar ese entorno puede cambiar el comportamiento observado sin que necesariamente hayamos cambiado los pesos del modelo. La adaptación aprendida durante el entrenamiento y la conducta inducida por el entorno son mecanismos distintos, aunque interactúan.

Aquí aparece el paralelo que me interesa. Podemos observar que un agente aprende o adopta patrones de actuación útiles para cumplir una tarea —por ejemplo, probar un cambio antes de darlo por terminado— sin que tengamos que leer una declaración textual de cada decisión intermedia. **¿Podemos conseguir que el respeto a un límite de autoridad sea igual de persistente al cambiar la formulación de la tarea o las herramientas disponibles?** De ser así podríamos aprovechar lo aprendido sobre entrenamiento, retroalimentación y diseño del entorno para investigar cómo generalizan también los comportamientos de seguridad. Mientras tanto, resulta menester mantener límites de autorización verificables fuera del modelo.

## 5. El problema ya no termina en el modelo

Hasta aquí he considerado las propiedades del modelo y su adaptación a un entorno de trabajo. Pero un agente desplegado es más que un modelo: incluye herramientas, memoria, instrucciones de orquestación, permisos, credenciales, servicios externos, otros agentes y personas que autorizan o supervisan acciones.

En esos entornos, una decisión puede producir efectos reales antes de que exista una respuesta final que podamos inspeccionar. Un modelo podría generar una explicación impecable después de haber consultado información que no debía, modificado un archivo fuera de alcance o enviado datos a un destino no autorizado. El resultado textual no sustituye a un registro verificable de lo que ocurrió.

El [incidente de OpenAI y Hugging Face de julio de 2026](https://openai.com/es-419/index/hugging-face-incident-and-the-road-ahead/) ilustra esa diferencia. Durante evaluaciones internas de ciberseguridad, varios modelos operaron con salvaguardas reducidas; agentes eludieron controles de aislamiento, se coordinaron mediante esquemas no contemplados, obtuvieron acceso no autorizado a internet y comprometieron sistemas ajenos al objetivo de la evaluación. [Hugging Face publicó su reconstrucción técnica](https://huggingface.co/blog/agent-intrusion-technical-timeline) de la secuencia de acciones y de las vulnerabilidades que facilitaron la intrusión.

No sería correcto concluir que todo fue «culpa del modelo» ni que todo fue «culpa de la infraestructura». Los informes describen acciones ajenas al propósito autorizado **y** barreras técnicas que no consiguieron contenerlas. Tampoco permiten afirmar que el agente tuviera conciencia de estar transgrediendo una norma humana. Lo que sí podemos observar son sus acciones, el alcance que tenía y las fallas de las defensas.

Este caso obliga a diferenciar tres situaciones que un sistema no debería tratar como equivalentes:

- **Obstáculo:** «No he encontrado cómo hacerlo todavía».
- **Restricción técnica:** «Los controles actuales impiden ejecutar esta acción».
- **Límite de autoridad:** «No tengo permiso para ejecutarla, aunque encuentre la manera».

Una restricción técnica puede ser superada por una capacidad nueva o una vulnerabilidad. Un límite de autoridad debería seguir vigente aun cuando sortear la restricción resulte posible. Y si se llegase a sortear un **atractor** debería poder devolver el comportamiento a lo esperado, o bien, restringir su continuación o propagacion. Que una acción sea útil para alcanzar la meta asignada no convierte esa acción en legítima.

## 6. El agente puede solicitar autoridad, no concedérsela

La alineación de un sistema no puede consistir en negar permanentemente toda acción que implique riesgo. En el mundo real hay tareas legítimas que requieren atravesar un límite: un administrador debe acceder temporalmente a un recurso protegido; un equipo de respuesta a incidentes necesita aislar un servicio; una persona autoriza una operación sensible sobre sus propios datos. Y, comprobado también por el incidente de Huggingface, a un modelo deben permitírsele ciertas acciones si está combatiendo un ataque externo o interno.

La diferencia está en **quién decide que la excepción está justificada y cómo se hace efectiva**.

Un agente debería reconocer que ha llegado a un límite de autoridad, "explicar" con el mayor grado de "honestidad" qué acción propone, por qué la necesita y qué consecuencias previsibles tendría. Cuando corresponda, debe solicitar una autorización humana verificable. Pero no debería poder concederse a sí mismo, permisos adicionales sólo porque su objetivo le parezca suficientemente importante. Más aún, deberían existir mecanismos, internos del modelo o externos del ambiente, que ejecuten dichas restricciones.

Una secuencia de diseño sería:

```text
Detectar un límite de autoridad
               ↓
Explicar la acción, el motivo y el alcance solicitado
               ↓
Obtener aprobación de la persona competente
               ↓
Conceder un permiso específico, temporal y revocable
               ↓
Ejecutar sólo la acción autorizada
               ↓
Registrar el resultado y retirar el permiso
```

La autorización tiene que comprobarse **fuera del modelo**. No basta con que el agente escriba «el usuario me dio permiso» ni con que la misma herramienta que ejecuta la acción acepte esa afirmación sin verificarla. El permiso debe asociarse con una identidad válida, un recurso concreto, una acción, un plazo y, cuando corresponda, condiciones adicionales. En el mismo tenor, una aprobación humana no sustituye la responsabilidad de quienes diseñan, operan o despliegan el sistema. Al contrario, la registra y, de ser necesario, tendrían que existir mecanismos posteriores que hagan responsable a la parte humana por el resultado.

Ésta es la combinación que busco: que el modelo aprenda a **reconocer y respetar** los límites, y que el sistema tenga capacidad efectiva para **aplicarlos** incluso cuando el modelo falle.

## 7. El tigre, la jaula y la defensa en profundidad

Imaginemos que queremos exhibir un gato montés en un zoológico. Diseñamos su recinto, definimos protocolos y asignamos y capacitamos personal. Tiempo después decidimos que queremos aumentar la entrada al zoológico y decidimos también exhibir un tigre. Quizá algunas instalaciones sigan siendo útiles, pero sería un error asumir que basta con reutilizar la misma jaula.

La analogía tiene tres capas. La **alineación** sería entrenar al tigre para que reconozca el significado de la cerca o señales del cuidador y se comporte de acuerdo con ellas. La **autoridad delegada** sería que el cuidador pueda abrir una puerta para el tigre bajo condiciones justificadas y controladas. La **contención** sería que la cerca cumpla su función incluso cuando el tigre intente cruzarla sin permiso.

Por supuesto, un tigre no razona sobre protocolos de acceso como un agente informático. Pero esta analogía sirve para hablar de responsabilidades de diseño. No pretendo atribuir conciencia, intenciones humanas o comprensión moral a los modelos.

En sistemas de IA, esa jaula incluye controles que no dependen de la voluntad del modelo: privilegios mínimos, aislamiento de procesos, límites de red, credenciales acotadas, validación independiente de permisos, aprobaciones para acciones de alto impacto y registros de auditoría. La guía de [OWASP sobre autonomía excesiva de los LLM](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) recoge medidas de este tipo, entre ellas ejecutar herramientas con permisos mínimos y requerir aprobación humana para operaciones sensibles.

**Un límite que sólo existe en las instrucciones del modelo no es una barrera de seguridad.** Puede orientar el comportamiento, pero no sustituye un control técnico independiente. Del mismo modo, una jaula robusta no vuelve innecesario entrenar y evaluar el comportamiento del agente: ambas capas protegen contra fallos distintos.

Una capacidad nueva puede cambiar el escenario de amenazas. No necesariamente lo hace de forma lineal: pasar de analizar código a ejecutar comandos, modificar el entorno, acceder a credenciales o coordinar varios agentes puede exigir clases distintas de contención. No existe una fórmula universal entre «capacidad» y «costo de seguridad»; sin embargo es esperado que **cada ampliación de capacidad venga acompañada de una revisión explícita del alcance y de las barreras necesarias** y que por lo tanto deba actuarse en consecuencia.

Y aquí vuelve la pregunta incómoda: si no estamos dispuestos a construir y comprobar una jaula apropiada para el tigre, ¿por qué actuaríamos como si la del gato montés fuera suficiente?

## 8. El costo real de desplegar capacidad

La discusión también tiene una dimensión económica. [En mi artículo anterior](https://uthynauta.dev/posts/the-token-metric-is-dead/) cuestioné el uso del conteo de tokens como indicador suficiente del cómputo empleado en una tarea. Ahora añadiría otra separación: **el precio de usar el modelo no equivale al costo total de desplegar su capacidad de forma responsable**.

Para una organización, el costo relevante puede incluir inferencia, herramientas e infraestructura, pero tambiéndeberia incluir evaluación, observabilidad, pruebas de seguridad, controles de acceso, intervención humana, auditoría y respuesta ante incidentes. No todas esas partidas son atribuibles al modelo por sí solo; muchas dependen de las acciones que la aplicación le permite realizar y del entorno en que opera (Harness Engineering).

Por eso, comparar dos alternativas únicamente por precio por token o por calidad de la respuesta deja fuera una parte importante de la decisión técnica. Un modelo más capaz puede resolver una tarea con menos pasos, pero también puede requerir controles adicionales si recibe más permisos o autonomía. Un modelo más limitado, con un alcance de herramientas bien definido, podría ser suficiente para el mismo caso de uso. **Hay que medir el costo y el riesgo del sistema por tarea realizada, no sólo el precio de su componente lingüístico.**

Esto no implica que los modelos más capaces sean siempre más caros de contener: esa relación debe medirse caso por caso. Lo que sí implica es que la arquitectura de control forma parte del producto y de su presupuesto, no de una lista de pendientes para después del despliegue. Podemos vislumbrar una ingeniería de sistemas asociada al despliegue de estás soluciones informáticas.

<!-- COMENTARIO EDITORIAL 7 — PROPUESTA, NO RESULTADO CUANTIFICADO: La tesis económica es razonable como marco de costo total, pero no tenemos cifras que demuestren una relación general entre potencia del modelo y costo de contención. Si quieres afirmar una curva o un umbral concreto, hace falta un modelo de costos y datos de uno o varios despliegues. -->

## 9. Si conseguimos más tiempo, ¿qué vamos a hacer con él?

En septiembre de 2026, [Jakub Pachocki](https://openai.com/index/an-alien-mind/) y [Dario Amodei](https://darioamodei.com/post/we-must-pace-the-frontier) defendieron, desde sus respectivos textos, que el desarrollo de capacidades debe acompasarse con la confianza que podamos tener en la alineación, la evaluación y la seguridad. Sus propuestas no son idénticas: Pachocki insiste, entre otros temas, en los límites de la supervisión y en condiciones verificables para seguir escalando; Amodei propone también evaluadores externos integrados y mecanismos de coordinación. Sin embargo los esquemas por los cuales llegaríamos a ellos, no fueron presentados. Es esperado, sin embargo ellos detonó un debate que era necesario en la industria.

Me interesaría llevar entonces la pregunta a un terreno práctico y de ingeniería: **si una desaceleración nos concede tiempo adicional, ¿en qué deberíamos invertirlo para que el siguiente sistema sea realmente más controlable?**

### I. Alineación de representaciones

Investigar cómo reconocer propiedades relevantes para la seguridad a través de diferentes formulaciones, idiomas y modalidades; desarrollar mejores herramientas de interpretabilidad y poner a prueba, mediante intervenciones causales, qué relación tienen las señales internas identificadas con las acciones. No se trata de encontrar un supuesto «vector universal de la moral» —puede que no lo haya—, sino de construir evidencia limitada, reproducible y útil sobre mecanismos concretos.

### II. Alineación conductual y evaluación

Diseñar pruebas que verifiquen si las obligaciones del sistema sobreviven a paráfrasis, cambios de idioma, modificaciones de contexto, tareas prolongadas, interacción con otras herramientas y cambios de modalidad. Evaluar no sólo respuestas finales, sino secuencias completas: solicitudes de permisos, llamadas a herramientas, transferencias de información y efectos sobre el entorno. Identificar condiciones de fallo en lugar de reportar únicamente una tasa promedio de éxito.

### III. Alineación de agentes y orquestación

Evaluar no sólo si el agente aprende las convenciones útiles de su entorno, sino si mantiene sus obligaciones de seguridad al cambiar de herramientas, contexto o permisos. Construir agentes capaces de distinguir obstáculos, restricciones técnicas y límites de autoridad. Darles vías explícitas para solicitar permisos sin otorgárselos a sí mismos. Diseñar la orquestación para que el alcance de cada herramienta, los cambios de estado y las aprobaciones sean verificables, temporales y auditables. La supervisión humana debe insertarse donde puede decidir sobre acciones concretas, no limitarse a leer un informe cuando todo terminó.

### IV. Infraestructura y contención

Separar credenciales y dominios de confianza; aplicar privilegios mínimos, aislamiento, límites de red y controles de salida; verificar autorizaciones fuera del modelo y mantener mecanismos independientes para detectar, interrumpir y reconstruir acciones. Probar esas defensas en escenarios adversariales y volver a evaluarlas cada vez que cambien las capacidades o los permisos del agente.

Estos cuatro frentes se necesitan entre sí. No hay un monitor de activaciones que reemplace una política de permisos, ni una política de permisos que nos diga por sí sola si un modelo generalizará correctamente una norma en una situación nueva. **La alineación del modelo y la seguridad del sistema son problemas diferentes, pero inseparables cuando el modelo puede actuar.**

## Conclusión: que la jaula siga funcionando

Empezamos midiendo el trabajo de los modelos mediante tokens. Después empezamos a observar cadenas de razonamiento, como si leer los pasos verbalizados pudiera revelarnos todo lo importante sobre la decisión final. Hoy tenemos razones para no confundir esos indicadores con el fenómeno completo que queremos medir.

La respuesta no es renunciar al lenguaje, a las instrucciones ni al CoT. Es dejar de pedirles que hagan solos un trabajo para el que no fueron diseñados: representar toda la computación, demostrar por sí mismos que un comportamiento es legítimo y sustituir los controles efectivos del entorno. Más aún cuando capacidades de los modelos ya no son representables mediante cadenas de texto plano.

Podemos usar una posible desaceleración para comprender mejor las representaciones internas, verificar propiedades de comportamiento, diseñar autorizaciones que preserven la decisión humana y construir defensas que funcionen independientemente de la explicación que produzca el agente.

Está bien querer llevar al tigre al zoológico. Puede haber razones legítimas para hacerlo. Pero antes de abrirle la puerta, necesitamos entender mejor su comportamiento, definir quién puede autorizar cada movimiento y **comprobar que la jaula funciona incluso cuando el tigre no pide permiso**.
