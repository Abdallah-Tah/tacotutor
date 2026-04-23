#!/bin/bash
# TacoTutor watchdog - restarts if crashed
if ! lsof -i :8088 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[$(date)] TacoTutor web down, restarting..." >> /tmp/tacotutor_watchdog.log
    cd /home/abdaltm86/Documents/tacotutor
    export GEMINI_API_KEY=AIzaSyCHIeMewNAZKcWFN8gqbkDH7v_Lff1UiUo
    nohup .venv/bin/python main.py >> /tmp/tacotutor.log 2>&1 &
    echo "[$(date)] Web restarted with PID $!" >> /tmp/tacotutor_watchdog.log
fi

if ! lsof -i :8089 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[$(date)] TacoTutor live down, restarting..." >> /tmp/tacotutor_watchdog.log
    cd /home/abdaltm86/Documents/tacotutor
    export GEMINI_API_KEY=AIzaSyCHIeMewNAZKcWFN8gqbkDH7v_Lff1UiUo
    nohup .venv/bin/python live.py >> /tmp/tacotutor_live.log 2>&1 &
    echo "[$(date)] Live restarted with PID $!" >> /tmp/tacotutor_watchdog.log
fi
