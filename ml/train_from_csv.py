import pandas as pd
from SmartCategorizer import SmartCategorizer

df = pd.read_csv("data/train.csv", sep=";")
df = df.drop_duplicates(subset=['description'])

texts = df['description'].tolist()
cats = df['category'].tolist()
subcats = df['subcategory'].tolist()

cat_model = SmartCategorizer(model_path="models/categorizer_model.pkl")
cat_model.train(texts, cats, subcats)
print("Модель обучена и сохранена!")