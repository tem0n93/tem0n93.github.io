<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Свадьба Артёма и Насти</title>
    <style>
        /* Общие стили */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #fde2e4, #fadfe1);
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow-x: hidden;
        }
        .container {
            text-align: center;
            background: rgba(255, 255, 255, 0.9);
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            position: relative;
            animation: fadeIn 1.5s ease-in-out;
        }
        h1 {
            font-size: 3em;
            font-weight: bold;
            color: #e91e63;
            margin-bottom: 10px;
        }
        p {
            font-size: 1.2em;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .date {
            font-size: 1.8em;
            font-weight: bold;
            color: #4caf50;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            font-size: 1.2em;
            color: white;
            background-color: #e91e63;
            text-decoration: none;
            border-radius: 30px;
            transition: all 0.3s ease;
        }
        .button:hover {
            background-color: #d81b60;
            transform: scale(1.1);
        }
        footer {
            margin-top: 30px;
            font-size: 1em;
            color: #777;
        }

        /* Анимация появления */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Декоративные элементы */
        .flowers {
            position: absolute;
            top: -20px;
            left: -20px;
            width: 100px;
            height: 100px;
            background: url('https://i.imgur.com/4ZpQz6L.png') no-repeat center/contain;
            animation: float 3s infinite ease-in-out;
        }
        .flowers:nth-child(2) {
            top: auto;
            bottom: -20px;
            right: -20px;
            width: 80px;
            height: 80px;
            animation-delay: 1.5s;
        }
        @keyframes float {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-10px);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="flowers"></div>
        <div class="flowers"></div>
        <h1>Мы женимся!</h1>
        <p>Дорогие друзья и родные,</p>
        <p>Приглашаем вас разделить с нами самый важный день в нашей жизни — день нашей свадьбы!</p>
        <div class="date">9 августа 2025 года</div>
        <p>Место проведения будет объявлено позже.</p>
        <a href="#" class="button">Подтвердить присутствие</a>
        <footer>
            С любовью,<br>
            Артём и Настя ❤️
        </footer>
    </div>
</body>
</html>
