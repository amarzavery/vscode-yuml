const {
  extractBgAndNote,
  formatLabel,
  recordName,
  serializeDot,
  splitYumlExpr,
} = require("./yuml2dot-utils.js");

const RANKSEP = 0.5;

/*
Unofficial syntax, based on the class diagram syntax specified in yuml.me

Package        [package1]
Association    [package1]->[package2]
Labeled assoc  [package1]label->[package2]
Note           [package1]-[note: a note here]
*/

function parseYumlExpr(specLine) {
  const exprs = [];
  const parts = splitYumlExpr(specLine, "[");

  for (let i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    if (part.length === 0) continue;

    if (part.match(/^\[.*\]$/)) {
      // node
      part = part.substr(1, part.length - 2);
      const ret = extractBgAndNote(part, true);
      exprs.push([
        ret.isNote ? "note" : "tab",
        ret.part,
        ret.bg,
        ret.fontcolor,
      ]);
    } else if (part === "-") {
      // connector for notes
      exprs.push(["edge", "none", "none", "", "dashed"]);
    } else if (part.match(/->$/)) {
      // line w/ or wo/ label
      part = part.substr(0, part.length - 2).trim();
      exprs.push(["edge", "none", "vee", part, "dashed"]);
    } else throw "Invalid expression";
  }

  return exprs;
}

function composeDotExpr(specLines, options) {
  const uids = {};
  let len = 0;
  let dot = `    ranksep = ${RANKSEP}\n`;
  dot += "    rankdir = " + options.dir + "\n";

  for (let i = 0; i < specLines.length; i++) {
    const elem = parseYumlExpr(specLines[i]);

    for (let k = 0; k < elem.length; k++) {
      const type = elem[k][0];

      if (type === "note" || type === "tab") {
        let label = elem[k][1];
        if (uids.hasOwnProperty(recordName(label))) continue;

        const uid = "A" + (len++).toString();
        uids[recordName(label)] = uid;

        label = formatLabel(label, 20, true);

        const node = {
          shape: type,
          height: 0.5,
          fontsize: 10,
          margin: "0.20,0.05",
          label: label,
        };

        if (elem[k][2]) {
          node.style = "filled";
          node.fillcolor = elem[k][2];
        }

        if (elem[k][3]) node.fontcolor = elem[k][3];

        dot += "    " + uid + " " + serializeDot(node) + "\n";
      }
    }

    for (let k = 1; k < elem.length - 1; k++) {
      if (
        elem[k][0] === "edge" &&
        elem[k - 1][0] !== "edge" &&
        elem[k + 1][0] !== "edge"
      ) {
        const style =
          elem[k - 1][0] === "note" || elem[k + 1][0] === "note"
            ? "dashed"
            : elem[k][4];

        const edge = {
          shape: "edge",
          dir: "both",
          style: style,
          arrowtail: elem[k][1],
          arrowhead: elem[k][2],
          labeldistance: 2,
          fontsize: 10,
        };

        if (elem[k][3].length > 0) edge.label = elem[k][3];

        dot +=
          "    " +
          uids[recordName(elem[k - 1][1])] +
          " -> " +
          uids[recordName(elem[k + 1][1])] +
          " " +
          serializeDot(edge) +
          "\n";
      }
    }
  }

  dot += "}\n";
  return dot;
}

module.exports = composeDotExpr;
