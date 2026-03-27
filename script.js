/**
 * AI Perception Master - Final Client-Side Engine & UI
 * Fixed: Variable shadowing, Jargon boundaries, Placeholder logic, Initial Race conditions.
 */
class PerceptionAnalyzer {
    constructor(d) {
        this.un = d.unnatural || [];
        this.up = d.unprofessional || [];
        this.am = d.ambiguous || [];
        this.jr = d.jargon || [];
        this.ra = d.rationale || [];
        this.hu = d.humanity || [];
    }

    analyze(text) {
        const f = this._analyzeWords(text);
        const s = this._analyzeSentences(text);
        const p = this._analyzeParagraphs(text, s);
        const cr = this._estimateCodeRatio(text);
        const jd = this._calculateJargonDensity(text);
        const ra = this._calculateRationale(text);
        const hu = this._calculateHumanity(text);
        const sc = this._getScores(text, f, ra, hu);
        return { findings: f, sentences: s, paragraphs: p, tech_metrics: { code_ratio: cr, jargon_density: jd, rationale: ra, humanity: hu }, scores: sc };
    }

    _analyzeWords(text) {
        let res = [];
        [{ l: this.un, t: 'unnatural' }, { l: this.up, t: 'unprofessional' }, { l: this.am, t: 'ambiguous' }].forEach(c => {
            c.l.forEach(([p, s]) => {
                const r = new RegExp(p, 'gi'); let m;
                while ((m = r.exec(text)) !== null) {
                    res.push({ start: m.index, end: m.index + m[0].length, type: c.t, text: m[0], suggestion: s });
                }
            });
        });
        res.sort((a, b) => a.start - b.start);
        let fin = [];
        if (res.length) {
            let cur = res[0];
            for (let i = 1; i < res.length; i++) {
                let n = res[i];
                if (n.start < cur.end) {
                    if ((n.end - n.start) > (cur.end - cur.start)) cur = n;
                } else { fin.push(cur); cur = n; }
            }
            fin.push(cur);
        }
        return fin;
    }

    _analyzeSentences(text) {
        const re = /([.!?]+(?:\s+|\'|\"|$))/g;
        let sents = [], last = 0, m;
        while ((m = re.exec(text)) !== null) {
            const end = m.index + m[0].length;
            const t = text.substring(last, end).trim();
            if (t) sents.push({ start: last, end, complexity: this._calcComp(t), length: t.split(/\s+/).length });
            last = end;
        }
        if (last < text.length) {
            const t = text.substring(last).trim();
            if (t) sents.push({ start: last, end: text.length, complexity: this._calcComp(t), length: t.split(/\s+/).length });
        }
        return sents;
    }

    _calcComp(s) {
        const w = s.split(/\s+/).filter(x => x);
        if (!w.length) return 0;
        const avg = w.reduce((a, b) => a + b.length, 0) / w.length;
        return Math.min(1, (Math.max(0, (avg - 4.5) / 8)) + (w.length / 30));
    }

    _estimateCodeRatio(text) {
        const lines = text.split('\n').filter(l => l.trim());
        if (!lines.length) return 0;
        const kw = new Set(['def', 'class', 'function', 'var', 'let', 'const', 'import', 'export', 'return', 'print', 'console', 'if', 'else', 'for', 'while', 'null', 'undefined']);
        let c = 0;
        lines.forEach(l => {
            let s = 0;
            if (/[{};()\[\]=+\-*/<>!|&]{2,}/.test(l)) s++;
            if ((l.match(/\b\w+\b/g) || []).some(x => kw.has(x))) s++;
            if (l.trim().endsWith(':') || l.trim().endsWith('{') || l.trim().endsWith(';')) s++;
            if (s >= 1) c++;
        });
        return Math.min(100, Math.floor((c / lines.length) * 100));
    }

    _calculateJargonDensity(text) {
        const w = text.split(/\s+/).filter(x => x);
        if (!w.length) return 0;
        let c = 0;
        this.jr.forEach(t => {
            const r = new RegExp(`\\b${t}\\b`, 'gi');
            const m = text.match(r); if (m) c += m.length;
        });
        return Math.min(100, Math.floor((c / w.length) * 500));
    }

    _calculateRationale(text) {
        let c = 0; this.ra.forEach(p => { const r = new RegExp(p, 'gi'); const m = text.match(r); if (m) c += m.length; });
        return Math.min(100, (c / (text.split(/\s+/).length || 1)) * 500);
    }

    _calculateHumanity(text) {
        let c = 0; this.hu.forEach(p => { const r = new RegExp(p, 'gi'); const m = text.match(r); if (m) c += m.length; });
        return Math.min(100, (c / (text.split(/\s+/).length || 1)) * 400);
    }

    _analyzeParagraphs(text, sents) {
        const paras = text.split(/\n\s*\n/);
        let cur = 0;
        return paras.map(p => {
            const start = text.indexOf(p, cur);
            const end = start + p.length; cur = end;
            const ps = sents.filter(s => s.start >= start && s.end <= end);
            return { start, end, sentenceCount: ps.length, isHeading: p.split(/\s+/).length < 8 && ps.length === 1 };
        });
    }

    _getScores(text, f, ra, hu) {
        const w = text.split(/\s+/).filter(x => x).length;
        if (!w) return { naturalness: 100, professionalism: 100, clarity: 100, humanity: 100 };
        const un = f.filter(x => x.type === 'unnatural').length;
        const up = f.filter(x => x.type === 'unprofessional').length;
        const am = f.filter(x => x.type === 'ambiguous').length;
        return { 
            naturalness: Math.max(0, 100 - un * 15), 
            professionalism: Math.max(0, 100 - up * 20), 
            clarity: Math.max(0, 100 - am * 12),
            humanity: Math.floor(hu)
        };
    }
}

const ed = document.getElementById('editor'), tt = document.getElementById('tooltip'), ttt = document.getElementById('tooltip-type'), tts = document.getElementById('tooltip-suggestion');
const scores = ['naturalness', 'professionalism', 'clarity', 'humanity'].reduce((a, s) => ({ ...a, [s]: { v: document.getElementById(`val-${s}`), f: document.getElementById(`fill-${s}`) } }), {});
const gauges = { code: { g: document.getElementById('gauge-code'), l: document.getElementById('label-code') }, jargon: { g: document.getElementById('gauge-jargon'), l: document.getElementById('label-jargon') } };
const substanceFill = document.getElementById('fill-substance'), substanceVal = document.getElementById('val-substance');
const pacingPath = document.getElementById('pacing-path'), hmt = document.getElementById('heatmap-toggle');
let dbt, analyzer;

async function init() {
    try {
        const r = await fetch('dictionary.json');
        const d = await r.json();
        analyzer = new PerceptionAnalyzer(d);
        document.body.classList.add('engine-ready');
        analyze();
    } catch (e) { console.error("Engine failure", e); }
}

function analyze() {
    const text = ed.innerText; if (!text.trim() || !analyzer) return;
    const res = analyzer.analyze(text);
    Object.keys(scores).forEach(s => { const v = res.scores[s]; if (scores[s].v) { scores[s].v.innerText = `${v}%`; scores[s].f.style.width = `${v}%`; } });
    gauges.code.g.setAttribute('stroke-dasharray', `${res.tech_metrics.code_ratio}, 100`);
    gauges.code.l.innerText = `${res.tech_metrics.code_ratio}%`;
    gauges.jargon.g.setAttribute('stroke-dasharray', `${res.tech_metrics.jargon_density}, 100`);
    gauges.jargon.l.innerText = `${res.tech_metrics.jargon_density}%`;
    substanceFill.style.width = `${res.tech_metrics.rationale}%`;
    substanceVal.innerText = `${Math.floor(res.tech_metrics.rationale)}%`;
    updateArc(res.sentences, res.paragraphs);
    render(res.findings, res.sentences);
}

function updateArc(sents, paras) {
    if (!sents || sents.length < 2) return;
    const w = 200, h = 60, p = 10;
    const pts = sents.map((s, i) => {
        const isLastInPara = paras.some(pr => pr.end === s.end);
        const fatigue = sents.slice(Math.max(0, i - 2), i + 1).reduce((acc, curr) => acc + (curr.length > 20 ? 1 : 0), 0);
        return { x: (i / (sents.length - 1)) * w, y: h - (Math.min(s.length, 30) / 30 * (h - p * 2)) - p, gap: isLastInPara, fatigue };
    });
    
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        if (i === 0) d += `M ${p1.x},${p1.y}`;
        const color = p1.fatigue >= 2 ? '#FF5E5E' : (p1.fatigue >= 1 ? '#FFB347' : '#47A1FF');
        // Simple lines to allow easy gaps and multi-colors (though SVG path color is usually uniform, we'll use gaps for now)
        if (p1.gap && i < pts.length - 2) d += ` M ${p2.x},${p2.y}`;
        else d += ` L ${p2.x},${p2.y}`;
    }
    pacingPath.setAttribute('d', d);
}

function render(f, sents) {
    hmt.checked ? document.body.classList.add('heatmap-on') : document.body.classList.remove('heatmap-on');
    const sel = window.getSelection(); if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0), offset = getCaret(ed, range), text = ed.innerText;
    let html = "";
    sents.forEach(s => {
        const cls = s.complexity > .7 ? "sentence-high" : (s.complexity > .4 ? "sentence-med" : "sentence-low");
        html += `<span class="sentence ${cls}">`;
        const sf = f.filter(x => x.start >= s.start && x.end <= s.end);
        let cur = s.start;
        sf.forEach(x => { html += text.substring(cur, x.start) + `<span class="mark mark-${x.type}" data-type="${x.type}" data-suggestion="${x.suggestion}">${text.substring(x.start, x.end)}</span>`; cur = x.end; });
        html += text.substring(cur, s.end) + `</span>`;
    });
    if (ed.innerHTML !== html) { ed.innerHTML = html; setCaret(ed, offset); }
    attach();
}

function getCaret(e, r) { const p = r.cloneRange(); p.selectNodeContents(e); p.setEnd(r.endContainer, r.endOffset); return p.toString().length; }
function setCaret(e, o) {
    const s = window.getSelection(), r = document.createRange(); let c = 0, f = false;
    (function t(n) {
        if (f) return;
        if (n.nodeType === 3) { const next = c + n.length; if (o >= c && o <= next) { r.setStart(n, o - c); r.setEnd(n, o - c); f = true; } c = next; }
        else for (let i = 0; i < n.childNodes.length; i++) t(n.childNodes[i]);
    })(e);
    if (f) { s.removeAllRanges(); s.addRange(r); }
}

function attach() {
    document.querySelectorAll('.mark').forEach(m => {
        m.onmouseenter = (e) => {
            const t = m.dataset.type, s = m.dataset.suggestion;
            ttt.innerText = t; ttt.className = `tooltip-type type-${t}`; tts.innerText = s;
            const r = m.getBoundingClientRect(); tt.style.left = `${r.left}px`; tt.style.top = `${r.bottom + 10}px`; tt.classList.add('active');
        };
        m.onmouseleave = () => tt.classList.remove('active');
    });
}

ed.oninput = () => { clearTimeout(dbt); dbt = setTimeout(analyze, 400); };
hmt.onchange = () => analyze();
init();
