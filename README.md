rojeto 2: Módulo de Painel de Instrumentos Automotivo com Trampoline RTOS
Visão geral
O projeto cria um painel de instrumentos automotivo (o ICM, Instrument Cluster Module). Ele roda no Trampoline, um sistema operacional de tempo real aberto que segue o padrão OSEK/VDX e é compatível com a API do AUTOSAR OS 4.2. O painel recebe sinais do veículo, processa esses dados dentro de prazos rígidos e mostra as informações ao motorista. Tudo é feito com previsibilidade, segurança e evidências de verificação guardadas no GitHub.

1. Entradas do veículo
O sistema recebe dados pela rede CAN e por sensores simulados:

velocidade do veículo (0 a 250 km/h);
rotação do motor (0 a 8.000 rpm);
nível de combustível e temperatura do líquido de arrefecimento;
setas de direção e estado dos alertas;
situação da recepção CAN e dos sensores.
Duas mensagens periódicas são definidas: M1 (rotação do motor), a cada 500 ms, e M2 (velocidade do veículo), a cada 1.000 ms.

2. Configuração do Trampoline RTOS
O sistema é descrito em arquivos OIL/ARXML. O compilador GOIL transforma essa descrição em código de configuração. Os objetos configurados são OS, TASK, ALARM, COUNTER, EVENT, RESOURCE e ISR.

3. Arquitetura de tarefas em tempo real
O trabalho é dividido em tarefas com períodos e prioridades diferentes:

Tarefa	Ativação	Função
Task_CAN_RX	Evento, prioridade alta	Recebe as mensagens CAN
Task_Acquisition	10 ms	Coleta os sinais
Task_Processing	20 ms	Valida, converte e filtra os dados
Task_Display	50 ms	Atualiza o painel
Task_Diagnostics	100 ms	Detecta falhas
Task_Logging	1.000 ms	Registra o histórico
A interrupção ISR2_CAN dispara um evento (SetEvent) que acorda a tarefa de recepção. Os alarmes ativam as tarefas periódicas. O escalonador funciona por prioridade com preempção: uma tarefa mais importante pode interromper uma menos importante.

4. Dados compartilhados e sincronização
Os dados ficam numa estrutura comum chamada ICM_Data, com velocidade, rotação, combustível, temperatura, indicadores e sinais de falha. Para acessar esses dados, cada tarefa usa GetResource(ICM_Resource) e ReleaseResource(ICM_Resource). O protocolo de teto de prioridade garante três coisas:

exclusão mútua (só uma tarefa mexe nos dados por vez);
ausência de inversão de prioridade sem limite;
ausência de condições de corrida.
5. Saídas do painel
O painel mostra velocímetro, conta-giros, combustível, temperatura, setas, luzes de alerta e mensagens ao motorista. Os dados seguem a sequência Receber → Validar → Converter escala → Filtrar → Exibir. Há regras de segurança para falhas:

Timeout CAN: o painel mostra um alerta e usa um valor seguro.
Sinal fora da faixa: o sistema registra uma falha de diagnóstico.
6. Compilação, testes e evidências no GitHub
O fluxo de trabalho é: repositório → código OIL + C → GOIL → compilar e ligar → simular ou gravar na placa → executar os testes. O trabalho em equipe usa issues, branches, commits, pull requests e revisão de código.

Os testes verificam:

se o sistema funciona corretamente;
se os períodos das tarefas e os prazos são cumpridos;
se os dados estão atualizados;
se o timeout CAN é tratado;
se os dados compartilhados estão protegidos;
se o painel atualiza de forma previsível;
a rastreabilidade e o relatório de testes.
Comportamento em tempo de execução
O diagrama de tempo mostra as tarefas sendo ativadas em seus períodos ao longo de 1.000 ms. Cada tarefa passa pelos estados Suspensa → Pronta → Executando → Esperando → Pronta. O comportamento é guiado pela preempção por prioridade, pela sincronização com eventos e pela ativação por alarmes.

Entregas
Requisitos do painel e dicionário de sinais
Projeto das tarefas, eventos, alarmes, interrupções e recursos
Configuração OIL e aplicação no Trampoline
Simulação das entradas CAN e dos sensores
Painel automotivo funcionando
Testes de tempo, de prazos e de tratamento de falhas
Repositório no GitHub, relatório técnico e demonstração
Rastreabilidade e critérios de qualidade
Cada requisito pode ser seguido até a entrega final: Requisito → Objeto OIL → Tarefa/Interrupção → Recurso compartilhado → Saída no painel → Evidência de verificação. O projeto é avaliado por estes critérios: correção, determinismo, cumprimento de prazos, segurança, concorrência, rastreabilidade e colaboração em equipe.
