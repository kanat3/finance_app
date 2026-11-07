import os
import re
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

class SmartCategorizer:
    def __init__(self, model_path="categorizer_model.pkl"):
        self.model_path = model_path
        
        self.default_rules = {
            r'заработная плата|зарплата|оклад|аванс|зп': ('Зарплата', 'Зарплата'),
            r'кэшбэк|кэшбек': ('Кэшбек', 'Кэшбек'),
            r'pyaterochka|пятероч': ('Продукты', 'Пятерочка'),
            r'dixy|дикс': ('Продукты', 'Дикси'),
            r'spar|спар': ('Продукты', 'Спар'),
            r'lenta|лент': ('Продукты', 'Лента'),
            r'magnoliya|магнолия|магнит': ('Продукты', 'Магнит'),
            r'lavka|лавка|yandex\*5411': ('Продукты', 'Яндекс Лавка'),
            r'vernyj|верный': ('Продукты', 'Верный'),
            r'perekrestok|перекресток': ('Продукты', 'Перекресток'),
            r'samokat|самокат': ('Транспорт', 'Самокат'),
            r'troika|тройка|mos.transport|метро': ('Транспорт', 'Метро'),
            r'yandex\*4121\*go|такси': ('Транспорт', 'Такси'),
            r'avtobus|автобус|tpp_ao': ('Транспорт', 'Автобус'),
            r'movista|поезд|travel_trains': ('Транспорт', 'Поезд'),
            r'rostics|кфс|kfc': ('Рестораны', 'КФС'),
            r'burger king|вкусно|vkusno': ('Рестораны', 'Бургерная'),
            r'dodo pizza|додо': ('Рестораны', 'Пиццерия'),
            r'tanuki|rolls|роллы': ('Рестораны', 'Роллы'),
            r'teremok|теремок': ('Рестораны', 'Теремок'),
            r'shawarma|шаурма': ('Рестораны', 'Шаурмичка'),
            r'coffee|кофе|bushe': ('Рестораны', 'Кофейня'),
            r'steam|ggsel|globalsteam': ('Развлечения', 'Стим'),
            r'method|компьютерный клуб': ('Развлечения', 'Компьютерный клуб'),
            r'lets ride|сапы': ('Развлечения', 'Сапы'),
            r'музей|gatchina|gmz': ('Развлечения', 'Музей'),
            r'apteka|аптека|таблетки': ('Здоровье', 'Таблетки'),
            r'fitnes|ddx fitness|спортзал': ('Спорт', 'Абонемент в спортзал'),
            r'yasno vizhu': ('Здоровье', 'Офтальмолог'),
            r'mbank\.t|телефон': ('Ежемесячное', 'Телефон'),
            r'zhku|oplatamos|коммуналка': ('Ежемесячное', 'ЕСПД (коммуналка)'),
            r'marino net|интернет': ('Ежемесячное', 'Домашний интернет'),
            r'ипотека|karta-credit': ('Ежемесячное', 'Ипотека'),
            r'wolfpn|vpn': ('Ежемесячное', 'ВПН'),
            r'перевод на договор|кредитная карта': ('Долги', 'Кредитная карта'),
            r'yandexbank_c2a|сплит': ('Долги', 'Сплит'),
            r't-travel|отель|hotel': ('Путешествия', 'Отель'),
            r'komissiya|комиссия': ('Разное', 'Комиссия'),
            r'postrus|почта': ('Разное', 'Почта'),
            r'kopirka|копирка|копия': ('Разное', 'Копирка'),
        }
        
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), lowercase=True)
        self.model = MultinomialNB()
        self.is_trained = False
        
        # 3. Загружаем модель (использует self.model_path)
        self.load_model()

    def train(self, texts, categories, subcategories=None):
        if len(texts) < 10:
            print("Мало данных для обучения ML (нужно хотя бы 10).")
            return False
        
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, categories)
        self.is_trained = True
        self.save_model()
        print(f"ML-модель обучена на {len(texts)} записях.")
        return True

    def save_model(self):
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump({
                'vectorizer': self.vectorizer,
                'model': self.model,
                'is_trained': self.is_trained
            }, f)

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.vectorizer = data['vectorizer']
                    self.model = data['model']
                    self.is_trained = data['is_trained']
                print(f"ML-модель загружена из {self.model_path}")
            except Exception as e:
                print(f"Не удалось загрузить модель: {e}")
        else:
            print(f"Файл модели не найден: {self.model_path}")

    def predict(self, description):
        desc_lower = str(description).lower()
        
        for pattern, (cat, subcat) in self.default_rules.items():
            if re.search(pattern, desc_lower):
                return cat, subcat, 100.0

        if self.is_trained:
            X_new = self.vectorizer.transform([desc_lower])
            cat = self.model.predict(X_new)[0]
            proba = max(self.model.predict_proba(X_new)[0])
            
            if proba > 0.45:
                return cat, '', round(proba * 100, 1)

        return 'Разное', 'Разное', 0.0