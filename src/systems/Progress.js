// Progreso del jugador: puntaje, preguntas respondidas por sitio, tiempo de
// espera tras fallar y zonas deportivas visitadas. Una respuesta correcta suma
// POINTS_CORRECT; una incorrecta resta POINTS_WRONG (sin bajar de 0) y bloquea
// el sitio durante COOLDOWN_MS.

import { QUESTIONS } from '../data/questions.js';

const POINTS_CORRECT = 100;
const POINTS_WRONG = -20;
const COOLDOWN_MS = 30000;

export class Progress {
  constructor(questions = QUESTIONS) {
    this.questions = questions;
    this.score = 0;
    this._answered = new Set();
    this._cooldownUntil = new Map();
    this._zones = new Set();
    this.zonesTotal = 0;
  }

  /** Registra la visita a una zona; devuelve false si ya estaba visitada. */
  visitZone(zoneId, points) {
    if (this._zones.has(zoneId)) return false;
    this._zones.add(zoneId);
    this.score += points;
    return true;
  }

  get zonesVisited() {
    return this._zones.size;
  }

  addScore(delta) {
    this.score += delta;
  }

  /** Pista aleatoria de la siguiente pregunta pendiente de algún sitio (o null). */
  getRandomPendingHint() {
    const hints = [];
    for (const siteId of Object.keys(this.questions)) {
      const next = this.getNextQuestion(siteId);
      if (next && next.question.hint) hints.push(next.question.hint);
    }
    return hints.length ? hints[Math.floor(Math.random() * hints.length)] : null;
  }

  _key(siteId, index) {
    return `${siteId}:${index}`;
  }

  siteQuestions(siteId) {
    return this.questions[siteId] || [];
  }

  /** Índice de la primera pregunta sin responder del sitio, o -1 si no queda ninguna. */
  nextQuestionIndex(siteId) {
    const questions = this.siteQuestions(siteId);
    for (let i = 0; i < questions.length; i++) {
      if (!this._answered.has(this._key(siteId, i))) return i;
    }
    return -1;
  }

  getNextQuestion(siteId) {
    const index = this.nextQuestionIndex(siteId);
    return index < 0 ? null : { index, question: this.siteQuestions(siteId)[index] };
  }

  isSiteComplete(siteId) {
    return this.siteQuestions(siteId).length > 0 && this.nextQuestionIndex(siteId) === -1;
  }

  isOnCooldown(siteId, now = Date.now()) {
    const until = this._cooldownUntil.get(siteId);
    return until != null && now < until;
  }

  /** Segundos restantes de espera para el sitio (0 si no hay). */
  cooldownRemaining(siteId, now = Date.now()) {
    const until = this._cooldownUntil.get(siteId);
    return until == null || now >= until ? 0 : Math.ceil((until - now) / 1000);
  }

  /** Procesa la respuesta elegida; devuelve { correct, delta, siteCompleted }. */
  answer(siteId, index, answer, now = Date.now()) {
    if (answer && answer.correct) {
      this._answered.add(this._key(siteId, index));
      this.score += POINTS_CORRECT;
      return { correct: true, delta: POINTS_CORRECT, siteCompleted: this.isSiteComplete(siteId) };
    }
    this.score = Math.max(0, this.score + POINTS_WRONG);
    this._cooldownUntil.set(siteId, now + COOLDOWN_MS);
    return { correct: false, delta: POINTS_WRONG, siteCompleted: false };
  }

  get answeredCount() {
    return this._answered.size;
  }

  get totalCount() {
    let total = 0;
    for (const siteId of Object.keys(this.questions)) total += this.questions[siteId].length;
    return total;
  }

  get sitesCompleted() {
    let count = 0;
    for (const siteId of Object.keys(this.questions)) if (this.isSiteComplete(siteId)) count++;
    return count;
  }

  get sitesTotal() {
    return Object.keys(this.questions).length;
  }

  stats() {
    return {
      score: this.score,
      answered: this.answeredCount,
      total: this.totalCount,
      sitesCompleted: this.sitesCompleted,
      sitesTotal: this.sitesTotal,
      zonesVisited: this.zonesVisited,
      zonesTotal: this.zonesTotal,
    };
  }
}
