"use strict";
const $ = id => document.getElementById(id), fmt = (v, n = 5) => Number.isFinite(v) ? Number(v).toFixed(n) : "—";
const fact = n => {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
};
const metricHTML = items => items.map(([k, v]) => `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join("");
const msg = (id, s = "") => $(id).textContent = s;
const layout = (title, xTitle = "x", yTitle = "f(x)") => ({
    title: {
        text: title,
        font: {size: 13, color: "#52647c"},
        x: .02
    },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#fbfdff",
    margin: {l: 52, r: 18, t: 45, b: 48},
    font: {family: "Arial, Microsoft YaHei", size: 11, color: "#718096"},
    xaxis: {title: xTitle, gridcolor: "#e9eef5", zerolinecolor: "#d5deea"},
    yaxis: {title: yTitle, gridcolor: "#e9eef5", zerolinecolor: "#d5deea"},
    legend: {orientation: "h", y: 1.12, x: 0},
    hovermode: "closest"
});
const config = {responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"]};
const specs = {
    sin: {
        name: "sin(x)",
        f: Math.sin,
        d: k => [Math.sin, Math.cos, x => -Math.sin(x), x => -Math.cos(x)][k % 4]
    },
    cos: {name: "cos(x)", f: Math.cos, d: k => [Math.cos, x => -Math.sin(x), x => -Math.cos(x), Math.sin][k % 4]},
    exp: {name: "eˣ", f: Math.exp, d: () => Math.exp}
};

function poly(x, a, n, key) {
    let s = 0;
    for (let k = 0; k <= n; k++) s += specs[key].d(k)(a) / fact(k) * (x - a) ** k;
    return s;
}

function rangeOK(a, b) {
    return Number.isFinite(a) && Number.isFinite(b) && a < b && b - a <= 100;
}

function runTaylor(prefix, center) {
    const fn = $(prefix + "Fn").value, n = +$(prefix + "N").value, a = center ? 0 : +$(prefix + "A").value,
        lo = +$(prefix + "Min").value, hi = +$(prefix + "Max").value;
    if (![a, n, lo, hi].every(Number.isFinite) || !Number.isInteger(n) || n < 1 || n > (center ? 14 : 12) || !rangeOK(lo, hi)) {
        msg(prefix + "Msg", "请检查参数：阶数为有效整数，且绘图范围左端小于右端（区间宽度不超过 100）。");
        return;
    }
    msg(prefix + "Msg");
    let xs = [], ys = [], ps = [];
    for (let i = 0; i <= 400; i++) {
        let x = lo + (hi - lo) * i / 400;
        xs.push(x);
        ys.push(specs[fn].f(x));
        ps.push(poly(x, a, n, fn));
    }
    let err = Math.max(...ys.map((v, i) => Math.abs(v - ps[i])));
    let chart = prefix === "taylor" ? "taylorChart" : "macChart";
    Plotly.react(chart, [{x: xs, y: ys, name: "原函数", mode: "lines", line: {color: "#2879e8", width: 2.6}}, {
        x: xs,
        y: ps,
        name: `${n} 阶多项式`,
        mode: "lines",
        line: {color: "#e99a32", width: 2, dash: "dash"}
    }, {
        x: [a],
        y: [specs[fn].f(a)],
        name: "展开中心",
        mode: "markers",
        marker: {size: 10, color: "#20a17c", symbol: "diamond"}
    }], layout(center ? "Maclaurin 多项式逼近" : "Taylor 多项式逼近", "x", "函数值"), config);
    if (center) {
        $("macCurrent").textContent = `P${n}(x)=Σ f⁽ᵏ⁾(0)xᵏ/k!`;
        $("macMetrics").innerHTML = metricHTML([["展开阶数", n], ["展开中心", "0"], ["采样最大误差", fmt(err, 7)]]);
    } else {
        $("taylorCurrent").textContent = `f(x)=${specs[fn].name}, a=${a}`;
        $("taylorExpansionText").textContent = `P${n}(x)=Σ[k=0…${n}] f⁽ᵏ⁾(${a})·(x−${a})ᵏ/k!`;
        $("taylorMetrics").innerHTML = metricHTML([["展开阶数", n], ["中心点", fmt(a, 3)], ["采样最大误差", fmt(err, 7)]]);
    }
}

function initTaylor() {
    $("taylorFormula").textContent = "f(x) = Σ[k=0…n] f⁽ᵏ⁾(a)(x−a)ᵏ/k! + Rₙ(x)";
    $("macFormula").textContent = "f(x) = Σ[k=0…n] f⁽ᵏ⁾(0)xᵏ/k! + Rₙ(x)";
    $("taylorForm").addEventListener("submit", e => {
        e.preventDefault();
        runTaylor("taylor", false)
    });
    $("macForm").addEventListener("submit", e => {
        e.preventDefault();
        runTaylor("mac", true)
    });
    for (const [id, fn] of [["taylorForm", () => runTaylor("taylor", false)], ["macForm", () => runTaylor("mac", true)]]) $(id).addEventListener("reset", () => setTimeout(fn, 0));
    runTaylor("taylor", false);
    runTaylor("mac", true);
}

const ndefs = {
    quad: {f: x => (x - 3) ** 2 + 1, g: x => 2 * (x - 3), h: x => 2, formula: "f(x)=(x−3)²+1"},
    quartic: {f: x => x ** 4 / 4 - x * x / 2, g: x => x ** 3 - x, h: x => 3 * x * x - 1, formula: "f(x)=x⁴/4−x²/2"},
    cos: {f: x => 1 - Math.cos(x), g: Math.sin, h: Math.cos, formula: "f(x)=1−cos(x)"}
};

function runNewton() {
    let d = ndefs[$("newtonFn").value], x = +$("newtonX0").value, N = +$("newtonSteps").value,
        lam = +$("newtonLambda").value;
    if (![x, N, lam].every(Number.isFinite) || !Number.isInteger(N) || N < 1 || N > 30 || lam < 0) {
        msg("newtonMsg", "请检查初始点、迭代次数（1–30）和非负阻尼 λ。");
        return;
    }
    msg("newtonMsg");
    let rows = [];
    for (let k = 0; k <= N; k++) {
        let g = d.g(x), h = d.h(x), fx = d.f(x);
        rows.push({k, x, f: fx, g, h});
        if (k === N) break;
        let den = h + lam;
        if (!Number.isFinite(den) || Math.abs(den) < 1e-9) {
            msg("newtonMsg", "二阶项接近零，已提前停止；请调整初始点或阻尼。");
            break;
        }
        let next = x - g / den;
        if (!Number.isFinite(next) || Math.abs(next) > 1e5) {
            msg("newtonMsg", "数值异常，已提前停止。");
            break;
        }
        x = next;
    }
    let lo = Math.min(-5, ...rows.map(r => r.x)) - 1, hi = Math.max(6, ...rows.map(r => r.x)) + 1;
    hi = Math.min(hi, 30);
    lo = Math.max(lo, -30);
    let xs = Array.from({length: 401}, (_, i) => lo + (hi - lo) * i / 400);
    Plotly.react("newtonChart", [{
        x: xs,
        y: xs.map(d.f),
        name: "目标函数",
        mode: "lines",
        line: {color: "#209a77", width: 2.5}
    }, {
        x: rows.map(r => r.x),
        y: rows.map(r => r.f),
        name: "迭代轨迹",
        mode: "lines+markers",
        line: {color: "#e65b68", dash: "dot"},
        marker: {size: 8}
    }], layout("牛顿法迭代路径", "x", "f(x)"), config);
    $("newtonFunction").textContent = d.formula;
    $("newtonRows").innerHTML = rows.map(r => `<tr><td>${r.k}</td><td>${fmt(r.x)}</td><td>${fmt(r.f)}</td><td>${fmt(r.g)}</td><td>${fmt(r.h)}</td></tr>`).join("");
    $("newtonMetrics").innerHTML = metricHTML([["实际更新步数", rows.length - 1], ["最终 x", fmt(rows.at(-1).x)], ["最终函数值", fmt(rows.at(-1).f)]]);
}

function setupNewton() {
    $("newtonFormula").textContent = "xₖ₊₁ = xₖ − f′(xₖ)/(f″(xₖ)+λ)";
    $("newtonForm").addEventListener("submit", e => {
        e.preventDefault();
        runNewton()
    });
    $("newtonForm").addEventListener("reset", () => setTimeout(runNewton, 0));
    runNewton();
}

const objective = (x, y) => .5 * (x * x + 8 * y * y), grad = (x, y) => [x, 8 * y];

function runBFGS() {
    let x = +$("bfgsX").value, y = +$("bfgsY").value, N = +$("bfgsSteps").value, s = +$("bfgsScale").value;
    if (![x, y, N, s].every(Number.isFinite) || !Number.isInteger(N) || N < 1 || N > 50 || s <= 0) {
        msg("bfgsMsg", "请检查起点、迭代次数（1–50）与正的初始尺度。");
        return;
    }
    msg("bfgsMsg");
    let H = [[s, 0], [0, s]], rows = [];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    for (let k = 0; k <= N; k++) {
        let g = grad(x, y);
        rows.push({k, x, y, f: objective(x, y), norm: Math.hypot(...g)});
        if (k === N || Math.hypot(...g) < 1e-8) break;
        let p = [-(H[0][0] * g[0] + H[0][1] * g[1]), -(H[1][0] * g[0] + H[1][1] * g[1])];
        let alpha = 1, fx = objective(x, y);
        while (alpha > 1e-7 && objective(x + alpha * p[0], y + alpha * p[1]) > fx + 1e-4 * alpha * dot(g, p)) alpha *= .5;
        if (alpha <= 1e-7) break;
        let nx = x + alpha * p[0], ny = y + alpha * p[1], ng = grad(nx, ny), sv = [nx - x, ny - y],
            yv = [ng[0] - g[0], ng[1] - g[1]], ys = dot(yv, sv);
        if (ys > 1e-12) {
            let rho = 1 / ys,
                I = [[1 - rho * sv[0] * yv[0], -rho * sv[0] * yv[1]], [-rho * sv[1] * yv[0], 1 - rho * sv[1] * yv[1]]],
                J = [[1 - rho * yv[0] * sv[0], -rho * yv[0] * sv[1]], [-rho * yv[1] * sv[0], 1 - rho * yv[1] * sv[1]]],
                tmp = [[I[0][0] * H[0][0] + I[0][1] * H[1][0], I[0][0] * H[0][1] + I[0][1] * H[1][1]], [I[1][0] * H[0][0] + I[1][1] * H[1][0], I[1][0] * H[0][1] + I[1][1] * H[1][1]]];
            H = [[tmp[0][0] * J[0][0] + tmp[0][1] * J[1][0] + rho * sv[0] * sv[0], tmp[0][0] * J[0][1] + tmp[0][1] * J[1][1] + rho * sv[0] * sv[1]], [tmp[1][0] * J[0][0] + tmp[1][1] * J[1][0] + rho * sv[1] * sv[0], tmp[1][0] * J[0][1] + tmp[1][1] * J[1][1] + rho * sv[1] * sv[1]]];
        }
        x = nx;
        y = ny;
    }
    const padRange = (values, minSpan = 2) => {
        let lo = Math.min(...values), hi = Math.max(...values), span = Math.max(hi - lo, minSpan), pad = span * .22;
        return [lo - pad, hi + pad];
    };
    let xr = padRange([...rows.map(r => r.x), 0], 2.5), yr = padRange([...rows.map(r => r.y), 0], 2.5);
    let xs = Array.from({length: 121}, (_, i) => xr[0] + (xr[1] - xr[0]) * i / 120),
        ys = Array.from({length: 121}, (_, i) => yr[0] + (yr[1] - yr[0]) * i / 120),
        z = ys.map(v => xs.map(u => objective(u, v)));
    Plotly.react("bfgsChart", [{
        x: xs,
        y: ys,
        z,
        type: "contour",
        contours: {coloring: "lines", showlabels: false},
        showscale: false,
        colorscale: [[0, "#f7fbff"], [1, "#dcecff"]],
        line: {color: "#a9c7e8", width: 1},
        hovertemplate: "x=%{x:.2f}<br>y=%{y:.2f}<extra></extra>"
    }, {
        x: rows.map(r => r.x),
        y: rows.map(r => r.y),
        type: "scatter",
        mode: "lines+markers",
        name: "BFGS 路径",
        line: {color: "#e65b68", width: 3},
        marker: {size: 9, color: "#e65b68", line: {color: "#ffffff", width: 1.5}}
    }, {
        x: [0],
        y: [0],
        type: "scatter",
        mode: "markers",
        name: "最优点 (0, 0)",
        marker: {size: 11, color: "#159b78", symbol: "star"}
    }], {
        ...layout("BFGS 二维优化轨迹", "x", "y"),
        xaxis: {title: "x", range: xr, gridcolor: "#edf2f8", zerolinecolor: "#cbd8e7"},
        yaxis: {title: "y", range: yr, scaleanchor: "x", scaleratio: 1, gridcolor: "#edf2f8", zerolinecolor: "#cbd8e7"}
    }, config);
    $("bfgsRows").innerHTML = rows.map(r => `<tr><td>${r.k}</td><td>${fmt(r.x)}</td><td>${fmt(r.y)}</td><td>${fmt(r.f)}</td><td>${fmt(r.norm)}</td></tr>`).join("");
    $("bfgsMetrics").innerHTML = metricHTML([["更新步数", rows.length - 1], ["最终目标值", fmt(rows.at(-1).f, 8)], ["最终梯度范数", fmt(rows.at(-1).norm, 8)]]);
}

function setupBFGS() {
    $("bfgsFormula").textContent = "Hₖ₊₁ = (I − ρsyᵀ) Hₖ (I − ρysᵀ) + ρssᵀ，ρ = 1/(yᵀs)";
    $("bfgsForm").addEventListener("submit", e => {
        e.preventDefault();
        runBFGS()
    });
    $("bfgsForm").addEventListener("reset", () => setTimeout(runBFGS, 0));
    runBFGS();
}

function dataSet() {
    return Array.from({length: 61}, (_, i) => {
        let x = -4 + i * 8 / 60;
        return {x, y: 1.7 + .85 * x + 1.8 * Math.sin(1.25 * x) + .45 * Math.cos(3 * x)};
    });
}

function bestSplit(data, indices, pred, lambda, minLeaf = 3) {
    let G = indices.map(i => pred[i] - data[i].y), H = indices.map(() => 1), sum = (a) => a.reduce((s, v) => s + v, 0),
        parentG = sum(G), parentH = H.length, base = parentG * parentG / (parentH + lambda);
    let best = null;
    for (let j = 1; j < indices.length; j++) {
        let li = indices.slice(0, j), ri = indices.slice(j);
        if (li.length < minLeaf || ri.length < minLeaf) continue;
        let gl = li.reduce((s, i) => s + pred[i] - data[i].y, 0), gr = parentG - gl, hl = li.length, hr = ri.length,
            gain = .5 * (gl * gl / (hl + lambda) + gr * gr / (hr + lambda) - base);
        if (!best || gain > best.gain) best = {
            gain,
            cut: (data[li.at(-1)].x + data[ri[0]].x) / 2,
            left: li,
            right: ri,
            wl: -gl / (hl + lambda),
            wr: -gr / (hr + lambda)
        };
    }
    return best;
}

function trainTree(data, pred, depth, lambda, lr, treeId) {
    let nodes = [], leafId = 0;

    function grow(ids, d) {
        let node = {id: leafId++, depth, indices: ids, leaf: true};
        nodes.push(node);
        let sp = d < depth ? bestSplit(data, ids, pred, lambda, 3) : null;
        if (sp && sp.gain > 1e-10) {
            node.leaf = false;
            node.gain = sp.gain;
            node.cut = sp.cut;
            node.left = grow(sp.left, d + 1);
            node.right = grow(sp.right, d + 1);
            node.value = null;
        } else {
            node.value = -ids.reduce((s, i) => s + (pred[i] - data[i].y), 0) / (ids.length + lambda);
            node.gain = 0;
        }
        return node;
    }

    let root = grow(data.map((_, i) => i), 0);

    function value(node, x) {
        if (node.leaf) return node.value;
        return value(x <= node.cut ? node.left : node.right, x);
    }

    return {root, nodes, predict: x => lr * value(root, x)};
}

function runXGB() {
    let trees = +$("xgbTrees").value, depth = +$("xgbDepth").value, lr = +$("xgbLr").value,
        lambda = +$("xgbLambda").value;
    if (![trees, depth, lr, lambda].every(Number.isFinite) || !Number.isInteger(trees) || trees < 1 || trees > 15 || !Number.isInteger(depth) || depth < 1 || depth > 4 || lr <= 0 || lr > 1 || lambda < 0) {
        msg("xgbMsg", "树数 1–15、深度 1–4、学习率 (0,1]，λ 不可为负。");
        return;
    }
    msg("xgbMsg");
    let data = dataSet(), mean = data.reduce((s, d) => s + d.y, 0) / data.length, pred = data.map(() => mean),
        loss = [data.reduce((s, d, i) => s + (d.y - pred[i]) ** 2, 0) / data.length], lastTree = null;
    for (let t = 0; t < trees; t++) {
        lastTree = trainTree(data, pred, depth, lambda, lr, t);
        pred = pred.map((p, i) => p + lastTree.predict(data[i].x));
        loss.push(data.reduce((s, d, i) => s + (d.y - pred[i]) ** 2, 0) / data.length);
    }
    let xs = data.map(d => d.x);
    Plotly.react("xgbChart", [{
        x: xs,
        y: data.map(d => d.y),
        name: "观测值",
        mode: "markers",
        marker: {color: "#3578d5", size: 6}
    }, {
        x: xs,
        y: pred,
        name: "提升树预测",
        mode: "lines",
        line: {color: "#e65c78", width: 2.6}
    }], layout("XGBoost 教学回归拟合", "特征 x", "目标 y"), config);
    Plotly.react("xgbLossChart", [{
        x: loss.map((_, i) => i),
        y: loss,
        name: "训练 MSE",
        mode: "lines+markers",
        line: {color: "#df6580", width: 2.5}
    }], layout("逐轮训练误差", "Boosting 轮次", "MSE"), config);
    $("xgbMetrics").innerHTML = metricHTML([["Boosting 轮数", trees], ["最终训练 MSE", fmt(loss.at(-1), 6)], ["末轮叶节点数", lastTree.nodes.filter(n => n.leaf).length]]);
}

function setupXGB() {
    $("xgbFormula").textContent = "w* = −G/(H+λ),  Gain = ½[Gₗ²/(Hₗ+λ)+Gᵣ²/(Hᵣ+λ)−G²/(H+λ)]";
    $("xgbForm").addEventListener("submit", e => {
        e.preventDefault();
        runXGB()
    });
    $("xgbForm").addEventListener("reset", () => setTimeout(runXGB, 0));
    runXGB();
}

function runLGB() {
    let maxLeaves = +$("lgbLeaves").value, maxDepth = +$("lgbDepth").value, minGain = +$("lgbGain").value;
    if (![maxLeaves, maxDepth, minGain].every(Number.isFinite) || !Number.isInteger(maxLeaves) || maxLeaves < 2 || maxLeaves > 16 || !Number.isInteger(maxDepth) || maxDepth < -1 || maxDepth === 0 || maxDepth > 8 || minGain < 0) {
        msg("lgbMsg", "叶子数 2–16，深度为 -1 或 1–8，最小增益不可为负。");
        return;
    }
    msg("lgbMsg");
    let data = dataSet(), root = {id: 0, parent: null, depth: 0, indices: data.map((_, i) => i), leaf: true},
        nodes = [root], seq = 1, history = [];
    while (nodes.filter(n => n.leaf).length < maxLeaves) {
        let candidates = nodes.filter(n => n.leaf && (maxDepth === -1 || n.depth < maxDepth)).map(n => ({
            node: n,
            split: bestSplit(data, n.indices, data.map(d => 0), 1, 3)
        })).filter(o => o.split && o.split.gain > minGain);
        if (!candidates.length) break;
        candidates.sort((a, b) => b.split.gain - a.split.gain);
        let {node, split} = candidates[0];
        node.leaf = false;
        node.cut = split.cut;
        node.gain = split.gain;
        node.left = {id: seq++, parent: node.id, depth: node.depth + 1, indices: split.left, leaf: true};
        node.right = {id: seq++, parent: node.id, depth: node.depth + 1, indices: split.right, leaf: true};
        nodes.push(node.left, node.right);
        history.push({id: node.id, cut: node.cut, gain: node.gain, leaves: nodes.filter(n => n.leaf).length});
    }
    let leaves = nodes.filter(n => n.leaf), maxD = Math.max(...nodes.map(n => n.depth)), leafOrder = [];

    function walk(n) {
        if (n.leaf) leafOrder.push(n); else {
            walk(n.left);
            walk(n.right)
        }
    }

    walk(root);
    let W = Math.max(650, leafOrder.length * 115), H = 100 + maxD * 100, pos = {};
    leafOrder.forEach((n, i) => pos[n.id] = {x: 45 + (i + .5) * (W - 90) / leafOrder.length, y: H - 55});
    for (let d = maxD; d >= 0; d--) nodes.filter(n => n.depth === d && !n.leaf).forEach(n => pos[n.id] = {
        x: (pos[n.left.id].x + pos[n.right.id].x) / 2,
        y: 45 + d * 100
    });
    nodes.filter(n => n.leaf).forEach(n => pos[n.id].y = 45 + n.depth * 100);
    let lines = nodes.filter(n => n.parent !== null).map(n => {
        let p = pos[n.parent], q = pos[n.id];
        return `<line x1="${p.x}" y1="${p.y + 17}" x2="${q.x}" y2="${q.y - 17}" stroke="#9aafc4" stroke-width="1.6"/>`;
    }).join("");
    let shapes = nodes.map(n => {
        let p = pos[n.id], leaf = n.leaf, label = leaf ? `叶 ${n.id}` : `x ≤ ${n.cut.toFixed(2)}`,
            sub = leaf ? `样本 ${n.indices.length}` : `Gain ${n.gain.toFixed(2)}`;
        return `<g><rect x="${p.x - 43}" y="${p.y - 17}" width="86" height="34" rx="8" fill="${leaf ? "#e7f8f3" : "#eaf2ff"}" stroke="${leaf ? "#28a783" : "#4f8de0"}"/><text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="10" fill="#29425d">${label}</text><text x="${p.x}" y="${p.y + 31}" text-anchor="middle" font-size="9" fill="#7a8da2">${sub}</text></g>`;
    }).join("");
    $("lgbTree").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="根据候选分裂增益构建的 Leaf-wise 树">${lines}${shapes}</svg><p class="tree-legend">分裂候选基于合成样本的平方误差梯度统计计算；按当前最大 Gain 的叶子优先扩展。</p>`;
    $("lgbRows").innerHTML = history.map((r, i) => `<tr><td>${i + 1}</td><td>${r.id}</td><td>${fmt(r.cut, 3)}</td><td>${fmt(r.gain, 5)}</td><td>${r.leaves}</td></tr>`).join("");
    $("lgbMetrics").innerHTML = metricHTML([["最终叶子数", leaves.length], ["实际分裂数", history.length], ["最大深度", maxD], ["数据样本数", data.length]]);
}

function setupLGB() {
    $("lgbFormula").textContent = "Gain = ½[Gₗ²/(Hₗ+λ)+Gᵣ²/(Hᵣ+λ)−G²/(H+λ)]";
    $("lgbForm").addEventListener("submit", e => {
        e.preventDefault();
        runLGB()
    });
    $("lgbForm").addEventListener("reset", () => setTimeout(runLGB, 0));
    runLGB();
}

$("themeToggle").addEventListener("click", () => document.body.classList.toggle("dark"));
window.addEventListener("load", () => {
    if (!window.Plotly) {
        document.querySelectorAll(".validation").forEach(el => el.textContent = "图表库未加载，请检查网络后刷新页面。");
        return;
    }
    initTaylor();
    setupNewton();
    setupBFGS();
    setupXGB();
    setupLGB();
});
