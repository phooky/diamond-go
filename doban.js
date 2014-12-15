var nodeGeometry = new THREE.BoxGeometry(0.04,0.04,0.04);

var NODE_EMPTY = 0;
var NODE_WHITE = 1;
var NODE_BLACK = 2;

var nodeMaterial = [
	new THREE.MeshBasicMaterial({color:0x009900}),
	new THREE.MeshBasicMaterial({color:0x990000}),
	new THREE.MeshBasicMaterial({color:0x000099})
];

var rankHeight = 0.1;
var rankDiag = rankHeight * Math.sqrt(2);

// A node is a space on the doban.
function Node(rank,x,y,index,doban) {
	this.rank = rank;
	this.doban = doban;
	this.x = x;
	this.y = y;
	this.links = [];
	this.index = index;
	this.key = [rank,x,y];

	var mesh = new THREE.Mesh(nodeGeometry,nodeMaterial[0]);
	mesh.position.y = (doban.ranks/2 - rank) * rankHeight;
	mesh.position.x = x * rankDiag;
	mesh.position.z = y * rankDiag;
	this.mesh = mesh;
	var pickMat = new THREE.MeshBasicMaterial({vertexColors:THREE.VertexColors});
	pickMat.blending = 0;
	var pickMesh = new THREE.Mesh(nodeGeometry.clone(), pickMat);
	pickMesh.geometry.faces.forEach( function( f ) {
		var n = ( f instanceof THREE.Face3 ) ? 3 : 4;
			for( var j = 0; j < n; j ++ ) {
				f.vertexColors[ j ] = new THREE.Color(index+1000);
			}
	} );
	this.pickMesh = pickMesh;
	this.pickMesh.position.x = this.mesh.position.x;
	this.pickMesh.position.y = this.mesh.position.y;
	this.pickMesh.position.z = this.mesh.position.z;
	doban.nodes[ this.key ] = this;
	doban.nodelist.push(this);
}

Node.prototype = {
	constructor : Node,
	link : function(nodeB) {
		if (nodeB) {
			this.links.push(nodeB);
			nodeB.links.push(this);
			this.doban.linesGeo.vertices.push(this.mesh.position);
			this.doban.linesGeo.vertices.push(nodeB.mesh.position);

		}
	},
	resolveDownLinks : function(nodes) {
		this.link(nodes[[this.rank+1, this.x-1, this.y]]);
		this.link(nodes[[this.rank+1, this.x+1, this.y]]);
		this.link(nodes[[this.rank+1, this.x, this.y -1]]);
		this.link(nodes[[this.rank+1, this.x, this.y +1]]);
	}
}

function Doban(ranks) {
	this.nodes = {};
	this.nodelist = [];
	this.ranks = ranks;
	var wx = 1;
	var wy = 1;
	var doban = this;
	var index = 0;
	// Build ranks of nodes
	for (var i = 0; i < ranks; i++) {
		var xoff = -wx+1;
		var yoff = -wy+1;
		for (var x = 0; x < wx; x++) {
			for (var y = 0; y < wy; y++) {
				var node = new Node(i,xoff+2*x,yoff+2*y,index++,this);
			}
		}
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
	this.linesGeo = new THREE.Geometry();
	this.linesMat = new THREE.LineBasicMaterial( { color: 0x777777, opacity: 1, linewidth: 2 } );
	// Create links between nodes
	for (var i = 0; i < this.nodelist.length; i++) {
		this.nodelist[i].resolveDownLinks(this.nodes);
	}
	// Create link lines
	this.linesMesh = new THREE.Line(this.linesGeo,this.linesMat,THREE.LinePieces);
}

Doban.prototype = {
	constructor : Doban,
	addToScene : function(scene) {
		for (var i = 0; i < this.nodelist.length; i++) {
			scene.add(this.nodelist[i].mesh);
		}
		scene.add(this.linesMesh);
	},
	addToPickingScene : function(pickingScene) {
		for (var i = 0; i < this.nodelist.length; i++) {
			pickingScene.add(this.nodelist[i].pickMesh);
		}
	}
}
