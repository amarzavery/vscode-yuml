const {
  extractBgAndNote,
  formatLabel,
  recordName,
  serializeDot,
  splitYumlExpr,
} = require("./yuml2dot-utils.js");

/*
Syntax as specified in yuml.me

Use Case	        (Login)
Actor	            [Customer]
<<Extend>>	        (Login)<(Forgot Password)
<<Include>>	        (Register)>(Confirm Email)
Actor Inheritance	[Admin]^[User]
Notes	            [Admin]^[User],[Admin]-(note: Most privilidged user)
*/

function parseYumlExpr(specLine) {
  const exprs = [];
  const parts = splitYumlExpr(specLine, "[(");

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    if (part.length === 0) continue;

    if (part.match(/^\(.*\)$/)) {
      // use-case
      part = part.substr(1, part.length - 2);
      const ret = extractBgAndNote(part, true);
      exprs.push([
        ret.isNote ? "note" : "record",
        ret.part,
        ret.bg,
        ret.fontcolor,
      ]);
    } else if (part.match(/^\[.*\]$/)) {
      // actor
      part = part.substr(1, part.length - 2);

      exprs.push(["actor", part]);
    } else
      switch (part) {
        case "<":
          exprs.push(["edge", "vee", "<<extend>>", "none", "dashed"]);
          break;
        case ">":
          exprs.push(["edge", "none", "<<include>>", "vee", "dashed"]);
          break;
        case "-":
          exprs.push(["edge", "none", "", "none", "solid"]);
          break;
        case "^":
          exprs.push(["edge", "none", "", "empty", "solid"]);
          break;
        default:
          throw "Invalid expression";
      }
  }

  return exprs;
}

function composeDotExpr(specLines, options) {
  const uids = {};
  let len = 0;
  let dot = "    ranksep = " + 0.7 + "\n";
  dot += "    rankdir = " + options.dir + "\n";

  for (let i = 0; i < specLines.length; i++) {
    const elem = parseYumlExpr(specLines[i]);

    for (let k = 0; k < elem.length; k++) {
      const type = elem[k][0];

      if (type === "note" || type === "record" || type === "actor") {
        let label = elem[k][1];
        if (uids.hasOwnProperty(recordName(label))) continue;

        const uid = "A" + (len++).toString();
        uids[recordName(label)] = uid;

        label = formatLabel(label, 20, false);

        const node = {
          fontsize: 10,
        };

        if (type === "actor") {
          node.margin = "0.05,0.05";
          node.shape = "none";
          node.label = "{img:actor} " + label;
          node.height = 1;
        } else {
          node.margin = "0.20,0.05";
          node.shape = type === "record" ? "ellipse" : "note";
          node.label = label;
          node.height = 0.5;

          if (elem[k][2]) {
            node.style = "filled";
            node.fillcolor = elem[k][2];
          }

          if (elem[k][3]) node.fontcolor = elem[k][3];
        }

        dot += "    " + uid + " " + serializeDot(node) + "\n";
      }
    }

    if (elem.length === 3 && elem[1][0] === "edge") {
      const style =
        elem[0][0] === "note" || elem[2][0] === "note" ? "dashed" : elem[1][4];

      const edge = {
        shape: "edge",
        dir: "both",
        style: style,
        arrowtail: elem[1][1],
        arrowhead: elem[1][3],
        labeldistance: 2,
        fontsize: 10,
      };
      if (elem[1][2].len > 0) edge.label = elem[1][2];

      dot +=
        "    " +
        uids[recordName(elem[0][1])] +
        " -> " +
        uids[recordName(elem[2][1])] +
        " " +
        serializeDot(edge) +
        "\n";
    }
  }

  dot += "}\n";
  return dot;
}

module.exports = composeDotExpr;
