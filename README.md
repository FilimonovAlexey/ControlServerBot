# Telegram бот для управления сервером
Телеграм бот для управления сервером и запущенными на сервере процессами.

## Функционал

### Управление процессами PM2
- Просмотр статуса процессов PM2
- Остановка процесса PM2
- Перезапуск процесса PM2
- Запуск процесса PM2

### Серверные команды
- Перезагрузка сервера
- Обновление пакетов сервера
- Обновление проектов с GitHub

## Демо бота
Обзор возможностей бота и инструкция по настройке - [Смотреть на YouTube]()  

## Деплой бота на сервер

* Установим Git и обновим компоненты системы
```bash
sudo apt update
sudo apt install git
```

* Клонируем репозиторий с ботом на сервер:
```bash
git clone https://github.com/FilimonovAlexey/ControlServerBot.git
```

* Переходим в папку проекта:
```bash
cd ControlServerBot

```

* Устанавливаем Node.js и пакетный менеджер npm
```bash
sudo apt install nodejs
sudo apt install npm
```

* Обновим Node js и npm, после выполняем перезапуск сервера
```bash
sudo npm install -g n
sudo n stable
```
* Устанавливаем все зависимости
```bash
cd ControlServerBot
npm i
```

* Создаем глобальную переменную
```bash
nano .env
```

* Создаем внутри файлов .env две переменные
```bash
BOT_API_KEY=''
SERVER_HOST=''
SERVER_USERNAME=''
SERVER_PASSWORD=''
ADMIN_ID=''
PROJECT_PATHS='name1:путь до папки на сервере,name2:путь до папки на сервере'
```

* Устанавливаем pm2 для запуска бота
```bash
npm i pm2 -g
```

* Запуск бота на сервере
```bash
pm2 start index.js
```

## Документация по grammy js

[Документация grammy js](https://grammy.dev/guide/)


## Authors

- [@FilimonovAlexey](https://github.com/FilimonovAlexey)