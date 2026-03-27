/**
 * AI Perception Master - Final Client-Side Engine & UI
 * Fixed: Variable shadowing, Jargon boundaries, Placeholder logic, Initial Race conditions.
 */
class PerceptionAnalyzer {
    constructor(d) {
        // Build a single Union Regex for all finding categories (O(N) Scanning)
        this.fDict = [];
        let combined = [];
        
        [{ l: d.unnatural, t: 'unnatural' }, { l: d.unprofessional, t: 'unprofessional' }, { l: d.ambiguous, t: 'ambiguous' }].forEach(c => {
            (c.l || []).forEach(entry => {
                const [p, s] = Array.isArray(entry) ? entry : [entry, ""];
                combined.push(`(${p})`);
                this.fDict.push({ type: c.t, suggestion: s });
            });
        });
        
        this.fRE = new RegExp(combined.join('|'), 'gi');
        
        // Technical & Tonality patterns
        const pComp = (list) => (list || []).map(entry => {
            const [p, s] = Array.isArray(entry) ? entry : [entry, ""];
            try { return [new RegExp(p, 'gi'), s]; } catch(e) { return null; }
        }).filter(x => x);

        this.jr = pComp(d.jargon);
        this.ra = pComp(d.rationale);
        this.hu = pComp(d.humanity);
    }

    analyze(text) {
        const start = performance.now();
        const f = this._analyzeWords(text);
        const s = this._analyzeSentences(text);
        const p = this._analyzeParagraphs(text, s);
        // Robust H1-H3 detection
        const h_re = /^(\#{1,3})\s+(.*)/gm;
        let hl = [], m;
        while ((m = h_re.exec(text)) !== null) hl.push({ start: m.index, end: m.index + m[0].length, level: m[1].length });
        
        const cr = this._estimateCodeRatio(text);
        const jd = this._calculateJargonDensity(text);
        const ra = this._calculateRationale(text);
        const hu = this._calculateHumanity(text);
        const sc = this._getScores(text, f, ra, hu);
        console.log(`Perception Scan: ${Math.round(performance.now() - start)}ms`);
        return { findings: f, sentences: s, paragraphs: p, headings: hl, tech_metrics: { code_ratio: cr, jargon_density: jd, rationale: ra, humanity: hu }, scores: sc };
    }

    _analyzeWords(text) {
        let res = [];
        this.fRE.lastIndex = 0;
        let m;
        while ((m = this.fRE.exec(text)) !== null) {
            // Find which group matched
            for (let i = 1; i < m.length; i++) {
                if (m[i]) {
                    const dict = this.fDict[i - 1];
                    res.push({ start: m.index, end: m.index + m[i].length, type: dict.type, text: m[i], suggestion: dict.suggestion });
                    break;
                }
            }
        }
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
        // Split on punctuation OR newlines to capture headers effectively
        const re = /([.!?]+(?:\s+|\'|\"|$))|(\n+)/g;
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
            // Enhanced heuristic: Is it a short line or starts with #?
            const isHeading = p.trim().startsWith('#') || (p.split(/\s+/).length < 10 && ps.length <= 1);
            return { start, end, sentenceCount: ps.length, isHeading };
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
const statusText = document.getElementById('status-text'), statusCont = document.getElementById('status-container');
let dbt, analyzer;

// Linear-time mapping for scannability map
function getSentenceParaMap(sents, paras) {
    let map = new Array(sents.length);
    let pIdx = 0;
    sents.forEach((s, sIdx) => {
        while (pIdx < paras.length && paras[pIdx].end < s.end) pIdx++;
        map[sIdx] = paras[pIdx] || paras[paras.length - 1];
    });
    return map;
}

async function init() {
    try {
        const r = await fetch('dictionary.json');
        const d = await r.json();
        analyzer = new PerceptionAnalyzer(d);
        document.body.classList.add('engine-ready');
        analyze();
    } catch (e) { 
        console.error("Engine failure", e);
        statusText.innerText = "Engine Error";
        statusCont.className = "status-indicator error";
    }
}

ed.onkeyup = () => {
    clearTimeout(dbt);
    statusText.innerText = "Analyzing...";
    statusCont.classList.add('analyzing');
    dbt = setTimeout(analyze, 350);
};

function analyze() {
    try {
        const text = ed.innerText; 
        if (!text.trim()) {
            statusCont.classList.remove('analyzing', 'fatigue', 'substance', 'humanity', 'error');
            statusText.innerText = "System Ready";
            return;
        }
        if (!analyzer) {
            statusText.innerText = "Engine Initializing...";
            return;
        }
        const res = analyzer.analyze(text);
        
        updateStatus(res);
        
        Object.keys(scores).forEach(s => { const v = res.scores[s]; if (scores[s].v) { scores[s].v.innerText = `${v}%`; scores[s].f.style.width = `${v}%`; } });
        gauges.code.g.setAttribute('stroke-dasharray', `${res.tech_metrics.code_ratio}, 100`);
        gauges.code.l.innerText = `${res.tech_metrics.code_ratio}%`;
        gauges.jargon.g.setAttribute('stroke-dasharray', `${res.tech_metrics.jargon_density}, 100`);
        gauges.jargon.l.innerText = `${res.tech_metrics.jargon_density}%`;
        substanceFill.style.width = `${res.tech_metrics.rationale}%`;
        substanceVal.innerText = `${Math.floor(res.tech_metrics.rationale)}%`;
        updateArc(res.sentences, res.paragraphs, res.headings);
        render(res.findings, res.sentences);
    } catch (e) {
        console.error(e);
        statusText.innerText = "Engine Error";
        statusCont.className = "status-indicator error";
    }
}

function updateStatus(res) {
    statusCont.classList.remove('analyzing', 'fatigue', 'substance', 'humanity', 'error');
    
    const totalSents = res.sentences.length;
    if (totalSents === 0) {
        statusText.innerText = "System Ready";
        return;
    }
    
    const redSents = res.sentences.filter(s => {
        // Recalculate fatigue for the status check
        const idx = res.sentences.indexOf(s);
        const f = res.sentences.slice(Math.max(0, idx - 2), idx + 1).reduce((acc, curr) => acc + (curr.length > 20 ? 1 : 0), 0);
        return f >= 2;
    }).length;

    if (redSents / totalSents > 0.15) {
        statusText.innerText = "Readability Fatigue!";
        statusCont.classList.add('fatigue');
    } else if (res.tech_metrics.rationale < 40) {
        statusText.innerText = "Substance Needed";
        statusCont.classList.add('substance');
    } else if (res.tech_metrics.humanity < 40) {
        statusText.innerText = "More Voice Needed";
        statusCont.classList.add('humanity');
    } else {
        statusText.innerText = "Draft Optimized";
        statusCont.classList.add('ready');
    }
}

let lastHTML = ""; // For dirty checking

function updateArc(sents, paras, headings) {
    if (!sents || sents.length < 2) return;
    const arcSegments = document.getElementById('arc-segments');
    if (!arcSegments) return;
    arcSegments.innerHTML = '';
    const frag = document.createDocumentFragment();
    const w = 200, h = 60, p = 10;
    
    const paraMap = getSentenceParaMap(sents, paras);
    const pts = sents.map((s, i) => {
        const para = paraMap[i];
        const heading = headings.find(h => s.start >= h.start && s.start < h.end);
        const fatigue = sents.slice(Math.max(0, i - 2), i + 1).reduce((acc, curr) => acc + (curr.length > 20 ? 1 : 0), 0);
        return { 
            x: (i / (sents.length - 1)) * w, 
            y: h - (Math.min(s.length, 30) / 30 * (h - p * 2)) - p, 
            gap: para && para.end === s.end, 
            isHeading: !!heading,
            start: s.start,
            fatigue
        };
    });
    
    for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        if (p1.gap && i < pts.length - 2) continue; // Skip segment for paragraph gap
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const color = p1.fatigue >= 2 ? '#FF5E5E' : (p1.fatigue >= 1 ? '#FFB347' : '#47A1FF');
        path.setAttribute('d', `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', p1.fatigue >= 1 ? '4' : '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('class', 'arc-segment-clickable');
        path.onclick = () => jumpToSentence(p1.start);
        if (p1.fatigue >= 1) path.setAttribute('style', `filter: drop-shadow(0 0 6px ${color}); opacity: 1;`);
        frag.appendChild(path);
        
        if (p1.isHeading) {
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            marker.setAttribute('x', p1.x - 0.5);
            marker.setAttribute('y', '0'); // Full height
            marker.setAttribute('width', '1');
            marker.setAttribute('height', '60');
            marker.setAttribute('fill', '#A78BFF');
            marker.setAttribute('class', 'arc-segment-clickable');
            marker.onclick = () => jumpToSentence(p1.start);
            marker.setAttribute('style', 'filter: drop-shadow(0 0 5px rgba(167,139,255,1)); opacity: 0.6;');
            frag.appendChild(marker);
        }
    }
    arcSegments.appendChild(frag);
}

function render(f, sents) {
    hmt.checked ? document.body.classList.add('heatmap-on') : document.body.classList.remove('heatmap-on');
    const offset = getCaret(ed);
    const text = ed.innerText;
    let html = "", fIdx = 0;
    
    sents.forEach(s => {
        const cls = s.complexity > .7 ? "sentence-high" : (s.complexity > .4 ? "sentence-med" : "sentence-low");
        html += `<span class="sentence ${cls}" data-start="${s.start}">`;
        
        // Linear two-pointer mapping for findings within this sentence
        let cur = s.start;
        while (fIdx < f.length && f[fIdx].start < s.end) {
            const x = f[fIdx];
            if (x.start >= s.start) {
                html += text.substring(cur, x.start) + `<span class="mark mark-${x.type}" data-type="${x.type}" data-suggestion="${x.suggestion}">${text.substring(x.start, x.end)}</span>`;
                cur = x.end;
            }
            fIdx++;
        }
        
        html += text.substring(cur, s.end) + `</span>`;
    });
    if (ed.innerHTML !== html) { 
        ed.innerHTML = html; 
        setCaret(ed, offset); 
    }
    attach();
}

function jumpToSentence(start) {
    const target = ed.querySelector(`.sentence[data-start="${start}"]`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('sentence-jump-target');
        setTimeout(() => target.classList.remove('sentence-jump-target'), 2000);
    }
}

function getCaret(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
}

function setCaret(el, offset) {
    const sel = window.getSelection();
    const range = document.createRange();
    let curr = 0;
    const nodeStack = [el];
    let node, found = false;

    while (nodeStack.length > 0 && !found) {
        node = nodeStack.pop();
        if (node.nodeType === 3) {
            const next = curr + node.length;
            if (offset >= curr && offset <= next) {
                range.setStart(node, offset - curr);
                range.setEnd(node, offset - curr);
                found = true;
            }
            curr = next;
        } else {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }
    if (found) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
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
