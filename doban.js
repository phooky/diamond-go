var nodeGeometry = new THREE.BoxGeometry(0.04,0.04,0.04);

var NODE_EMPTY = 0;
var NODE_WHITE = 1;
var NODE_BLACK = 2;

var nodeMaterial = [
	new THREE.MeshBasicMaterial({color:0x009900}),
	new THREE.MeshBasicMaterial({color:0x990000}),
	new THREE.MeshBasicMaterial({color:0x000099})
];


// A node is a space on the doban.
function Node(rank,x,y) {
	this.rank = rank;
	this.x = x;
	this.y = y;
	this.links = [];
	this.key = [rank,x,y];

}

Node.prototype = {
	constructor : Node,
	link : function(nodeB) {
		if (nodeB) {
			this.links.push(nodeB);
			nodeB.links.push(this);
		}
	},
	resolveDownLinks : function(nodes) {
		this.link(nodes[[this.rank+1, this.x-1, this.y]]);
		this.link(nodes[[this.rank+1, this.x+1, this.y]]);
		this.link(nodes[[this.rank+1, this.x, this.y -1]]);
		this.link(nodes[[this.rank+1, this.x, this.y +1]]);
	}
}



			var linesGeo = new THREE.Geometry();
			var makeMesh = function(node,ranks) {
					var mesh = new THREE.Mesh(nodeGeo,nodeMat);
					mesh.position.y = (ranks/2 - node.rank) * rankHeight;
					mesh.position.x = node.x * rankDiag;
					mesh.position.z = node.y * rankDiag;
					node.mesh = mesh;
					mesh.node = node;
					scene.add(mesh);

					var pickMat = new THREE.MeshBasicMaterial({vertexColors:THREE.VertexColors});
					pickMat.blending = 0;
					var pickMesh = new THREE.Mesh(nodeGeo.clone(), pickMat);
					pickMesh.geometry.faces.forEach( function( f ) {
						var n = ( f instanceof THREE.Face3 ) ? 3 : 4;
						for( var j = 0; j < n; j ++ ) {
							f.vertexColors[ j ] = new THREE.Color(node.index+1000);
						}
					} );
					pickMesh.position.y = (ranks/2 - node.rank) * rankHeight;
					pickMesh.position.x = node.x * rankDiag;
					pickMesh.position.z = node.y * rankDiag;
					pickingScene.add(pickMesh);
			}

			var rankHeight = 0.1;
			var rankDiag = rankHeight * Math.sqrt(2);
			var nodeMat = new THREE.MeshBasicMaterial({color:0x00ff00});
			var nodeSelMat = new THREE.MeshBasicMaterial({color:0x0000ff});
			var nodeGeo = new THREE.BoxGeometry(0.04,0.04,0.04);
			var linkMat = new THREE.LineBasicMaterial( { color: 0x777777, opacity: 1, linewidth: 3 } );
			var linesMesh = new THREE.Line(linesGeo,linkMat,THREE.LinePieces);
			scene.add(linesMesh);


function Doban(ranks) {
	this.nodes = {};
	this.nodelist = [];
	this.ranks = ranks;
	var wx = 1;
	var wy = 1;
	var doban = this;
	var index = 0;
	function buildRank(rank,wx,wy) {
		var xoff = -wx+1;
		var yoff = -wy+1;
		for (var x = 0; x < wx; x++) {
			for (var y = 0; y < wy; y++) {
				var node = new Node(rank,xoff+2*x,yoff+2*y);
				doban.nodes[ node.key ] = node;
				node.index = index;
				index++;
				doban.nodelist.push(node);
			}
		}
	}
	// Build ranks of nodes
	for (var i = 0; i < ranks; i++) {
		buildRank(i,wx,wy);
		var inc = 1;
		if (i >= Math.floor(ranks/2)) {
			inc = -1; 
		}
		if (i % 2 == 1) {
			wx += inc;
		} else {
			wy += inc;
		}
	}
	// Create links between nodes
	for (var i = 0; i < this.nodelist.length; i++) {
		this.nodelist[i].resolveDownLinks(this.nodes);
	}
	// Create meshes for nodes
}

Doban.prototype = {
	constructor : Doban
}
