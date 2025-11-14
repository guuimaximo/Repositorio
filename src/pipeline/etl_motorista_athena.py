from dotenv import load_dotenv
from supabase import create_client
import pandas as pd
import os
from sqlalchemy import create_engine

# --------------------------------------
# 1. LOAD ENV
# --------------------------------------
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
ATHENA_S3_STAGING_DIR = os.getenv("ATHENA_S3_STAGING_DIR")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")

DESTINATION_TABLE_NAME = "motoristas"   # TABELA CORRETA

# --------------------------------------
# 2. EXTRACT ATHENA
# --------------------------------------
print("Iniciando extração do Athena...")

athena_conn = (
    f"awsathena+rest://@athena.{AWS_REGION}.amazonaws.com:443/default?"
    f"s3_staging_dir={ATHENA_S3_STAGING_DIR}"
)

query = """
SELECT 
    matricula_motorista AS chapa,
    ope_nome AS nome
FROM "csc-views-gestao-informacao"."dim_motorista";
"""

try:
    df = pd.read_sql(query, create_engine(athena_conn))
    print("✅ Extração Athena concluída!")
except Exception as e:
    print(f"❌ Erro ao extrair dados do Athena: {e}")
    exit(1)

# --------------------------------------
# 3. TRANSFORMAÇÃO
# --------------------------------------
df = df.dropna()              # remove nulos
df = df.drop_duplicates()     # remove duplicados de chapa

df["cargo"] = "MOTORISTA"     # campo fixo

# id será gerado pelo Supabase automaticamente

print(f"Total de registros após transformação: {len(df)}")

# --------------------------------------
# 4. LOAD → Supabase REST
# --------------------------------------
print("\n🚀 Conectando ao Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_API_KEY)

records = df.to_dict(orient="records")

# --------------------------------------
# 4.1 DELETE ALL (agora funcionando)
# --------------------------------------
print("🗑️ Apagando todos os registros existentes...")

try:
    supabase.table(DESTINATION_TABLE_NAME).delete().neq("chapa", "__NONE__").execute()
    print("🗑️ Registros antigos apagados com sucesso.")
except Exception as e:
    print(f"⚠️ Falha ao apagar registros (possível RLS): {e}")

# --------------------------------------
# 4.2 INSERT
# --------------------------------------
print("\n📥 Inserindo novos registros...")

batch_size = 1000
inserted_total = 0

try:
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        resp = supabase.table(DESTINATION_TABLE_NAME).insert(batch).execute()

        if resp.data:
            inserted_total += len(resp.data)

    print(f"✅ Inserção concluída! Registros inseridos: {inserted_total}")

except Exception as e:
    print(f"❌ Erro ao inserir no Supabase: {e}")
    exit(1)

print("\n🚀 Processo ETL finalizado com sucesso.")
