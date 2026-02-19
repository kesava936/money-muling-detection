import CytoscapeComponent from "react-cytoscapejs";
import { useEffect, useState } from "react";

function GraphView({ data }) {

  const [elements, setElements] = useState([]);
  const [key, setKey] = useState(0);

  useEffect(() => {

    if (!data || !data.fraud_rings) return;

    let newElements = [];
    let nodeSet = new Set();

    // 🔹 Create Nodes
    data.fraud_rings.forEach((ring) => {

      ring.member_accounts.forEach((acc) => {

        if (!nodeSet.has(acc)) {

          nodeSet.add(acc);

          newElements.push({
            data: {
              id: acc,
              label: acc
            }
          });

        }

      });

    });

    // 🔹 Create Edges between members
    // Create safe ring-based edges
data.fraud_rings.forEach((ring)=>{

  const members = ring.member_accounts;

  if(members.length > 1){

    for(let i=0;i<members.length-1;i++){

      elements.push({
        data:{
          id:`${members[i]}-${members[i+1]}`,
          source:members[i],
          target:members[i+1]
        }
      });

    }

  }

});


    setElements(newElements);

    // 🔥 THIS LINE IS THE MAIN FIX
    setKey(prev => prev + 1);

  }, [data]);

  if (!elements.length) return null;

  return (
    <div style={{ height: "500px", background: "#111" }}>
      <CytoscapeComponent
        key={JSON.stringify(elements)}
        elements={elements}

        style={{ width: "100%", height: "100%" }}
        layout={{ name: "cose", animate: true }}
        stylesheet={[
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#007bff",
              color: "#fff",
              "text-valign": "center",
              "text-halign": "center"
            }
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#ccc",
              "target-arrow-color": "#ccc",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier"
            }
          }
        ]}
      />
    </div>
  );
}

export default GraphView;
