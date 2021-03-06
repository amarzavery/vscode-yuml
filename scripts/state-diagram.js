const {
  extractBgAndNote,
  formatLabel,
  recordName,
  serializeDot,
  splitYumlExpr,
} = require("./yuml2dot-utils.js");

const RANKSEP = 0.5;

/*
Unofficial syntax, based on the activity diagram syntax specified in yuml.me

Start	         (start)
End	             (end)
Activity         (Find Products)
Flow	         (start)->(Find Products)
Multiple Assoc.  (start)->(Find Products)->(end)
Complex case     (Simulator running)[Pause]->(Simulator paused|do/wait)[Unpause]->(Simulator running)
*/

function parseYumlExpr(specLine) {
  const exprs = [];
  const parts = splitYumlExpr(specLine, "(");

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (part.length === 0) continue;

    if (part.match(/^\(.*\)$/)) {
      // state
      part = part.substr(1, part.length - 2);
      const ret = extractBgAndNote(part, true);
      exprs.push([
        ret.isNote ? "note" : "record",
        ret.part,
        ret.bg,
        ret.fontcolor,
      ]);
    } else if (part.match(/->$/)) {
      // arrow
      part = part.substr(0, part.length - 2).trim();
      exprs.push(["edge", "none", "vee", part, "solid"]);
    } else if (part === "-") {
      // connector for notes
      exprs.push(["edge", "none", "none", "", "solid"]);
    } else throw "Invalid expression";
  }

  return exprs;
}

function composeDotExpr(specLines, options) {
  let node;
  const uids = {};
  let len = 0;
  let dot = `    ranksep = ${RANKSEP}\n`;
  dot += "    rankdir = " + options.dir + "\n";

  for (let i = 0; i < specLines.length; i++) {
    const elem = parseYumlExpr(specLines[i]);

    for (let k = 0; k < elem.length; k++) {
      const type = elem[k][0];

      if (type === "note" || type === "record") {
        let label = elem[k][1];
        if (uids.hasOwnProperty(recordName(label))) continue;

        const uid = "A" + (len++).toString();
        uids[recordName(label)] = uid;

        if (type === "record" && (label === "start" || label === "end")) {
          node = {
            shape: label === "start" ? "circle" : "doublecircle",
            height: 0.3,
            width: 0.3,
            margin: "0,0",
            label: "",
          };
        } else {
          label = formatLabel(label, 20, true);
          if (type === "record") label = "{" + label + "}";

          node = {
            shape: type,
            height: 0.5,
            fontsize: 10,
            margin: "0.20,0.05",
            label: label,
            style: "rounded",
          };

          if (elem[k][2]) {
            node.style = "filled";
            node.fillcolor = elem[k][2];
          }

          if (elem[k][3]) node.fontcolor = elem[k][3];
        }

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
