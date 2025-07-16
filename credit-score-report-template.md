# 📊 RELATÓRIO DE ANÁLISE DE CRÉDITO EMPRESARIAL

## EMPRESA ANALISADA: {{indicadores_cadastrais.razao_social}}

---

### 🎯 **RESUMO EXECUTIVO**

**Score de Crédito:** {{score}} pontos  
**Classificação:** {{classificacao}}  
**Avaliação:** {{motivo}}

---

### 💰 **PROPOSTA DE CRÉDITO PERSONALIZADA**

| **Condição** | **Valor** |
|--------------|-----------|
| **Valor Total do Crédito** | Conforme solicitado |
| **Entrada Recomendada** | {{entrada_sugerida}} |
| **Parcelamento** | {{numero_parcelas}} parcelas de {{valor_parcela}} |
| **Taxa de Juros Mensal** | {{juros_mensal}} |

---

### 📋 **INFORMAÇÕES CADASTRAIS**

| **Campo** | **Dados** |
|-----------|-----------|
| **Razão Social** | {{indicadores_cadastrais.razao_social}} |
| **CNPJ** | {{indicadores_cadastrais.cnpj}} |
| **Situação Cadastral** | {{indicadores_cadastrais.situacao_cadastral}} |
| **Porte Empresarial** | {{indicadores_cadastrais.porte}} |
| **Data de Abertura** | {{indicadores_cadastrais.data_abertura}} |
| **Atividade Principal** | {{indicadores_cadastrais.atividade_principal}} |
| **Capital Social** | {{indicadores_cadastrais.capital_social}} |
| **Sócio Administrador** | {{indicadores_cadastrais.socio_administrador}} |
| **Localização** | {{indicadores_cadastrais.municipio}}/{{indicadores_cadastrais.estado}} |

---

### 📈 **ANÁLISE FINANCEIRA**

| **Indicador** | **Valor Estimado** |
|---------------|-------------------|
| **Receita Anual** | {{indicadores_financeiros.receita_anual_estimativa}} |
| **Lucro Líquido** | {{indicadores_financeiros.lucro_liquido_estimado}} |
| **Endividamento Bancário** | {{indicadores_financeiros.divida_bancaria_estimativa}} |

---

### 🏗️ **PERFORMANCE OPERACIONAL**

| **Métrica** | **Resultado** |
|-------------|---------------|
| **Obras Entregues (Último Ano)** | {{indicadores_operacionais.obras_entregues_ultimo_ano}} |
| **Especialização** | {{indicadores_operacionais.tipo_principal_de_obra}} |
| **Área de Atuação** | {{indicadores_operacionais.regiao_de_atuacao}} |

---

### 📊 **MODELO DE OUTPUT PARA SISTEMA**

```json
[
  {
    "output": "```json\n{\n  \"score\": {{score}},\n  \"classificacao\": \"{{classificacao}}\",\n  \"motivo\": \"{{motivo}}\",\n  \"entrada_sugerida\": \"{{entrada_sugerida}}\",\n  \"numero_parcelas\": {{numero_parcelas}},\n  \"valor_parcela\": \"{{valor_parcela}}\",\n  \"juros_mensal\": \"{{juros_mensal}}\",\n  \"indicadores_cadastrais\": {\n    \"razao_social\": \"{{indicadores_cadastrais.razao_social}}\",\n    \"cnpj\": \"{{indicadores_cadastrais.cnpj}}\",\n    \"situacao_cadastral\": \"{{indicadores_cadastrais.situacao_cadastral}}\",\n    \"capital_social\": \"{{indicadores_cadastrais.capital_social}}\",\n    \"data_abertura\": \"{{indicadores_cadastrais.data_abertura}}\",\n    \"porte\": \"{{indicadores_cadastrais.porte}}\",\n    \"atividade_principal\": \"{{indicadores_cadastrais.atividade_principal}}\",\n    \"socio_administrador\": \"{{indicadores_cadastrais.socio_administrador}}\",\n    \"estado\": \"{{indicadores_cadastrais.estado}}\",\n    \"municipio\": \"{{indicadores_cadastrais.municipio}}\"\n  },\n  \"indicadores_financeiros\": {\n    \"receita_anual_estimativa\": \"{{indicadores_financeiros.receita_anual_estimativa}}\",\n    \"lucro_liquido_estimado\": \"{{indicadores_financeiros.lucro_liquido_estimado}}\",\n    \"divida_bancaria_estimativa\": \"{{indicadores_financeiros.divida_bancaria_estimativa}}\"\n  },\n  \"indicadores_operacionais\": {\n    \"obras_entregues_ultimo_ano\": {{indicadores_operacionais.obras_entregues_ultimo_ano}},\n    \"tipo_principal_de_obra\": \"{{indicadores_operacionais.tipo_principal_de_obra}}\",\n    \"regiao_de_atuacao\": \"{{indicadores_operacionais.regiao_de_atuacao}}\"\n  }\n}\n```"
  }
]
```

---

**Relatório gerado automaticamente pelo sistema DATAHOLICS - Hub de Crédito Inteligente**  
*Data de geração: {{data_atual}}*