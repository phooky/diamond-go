var nodeGeometry = new THREE.BoxGeometry(0.04,0.04,0.04);

var NODE_EMPTY = 0;
var NODE_WHITE = 1;
var NODE_BLACK = 2;

function DobanTheme(empty,white,black,emptyHi,whiteHi,blackHi,line,lineWidth,bg) {
	this.nodeMats = [ 
		new THREE.MeshBasicMaterial({color:empty}),
		new THREE.MeshBasicMaterial({color:white}),
		new THREE.MeshBasicMaterial({color:black}) ];
	this.nodeHiMats = [
		new THREE.MeshBasicMaterial({color:emptyHi}),
		new THREE.MeshBasicMaterial({color:whiteHi}),
		new THREE.MeshBasicMaterial({color:blackHi}) ];
	this.lineMat = new THREE.LineBasicMaterial( { color: line, opacity: 1, linewidth: lineWidth } );
	this.background = bg;
}

DobanTheme.prototype = {
	constructor : Node,
	getNodeMaterial : function(highlighted,state) {
		if (highlighted) { return this.nodeHiMats[state]; }
		return this.nodeMats[state];
	}
};

var defaultTheme = new DobanTheme(0x00bb00,0xbb00000,0x0000bb,0x00ff00,0xff0000,0x00000ff,
	0x777777, 2, 0);

var grayTheme = new DobanTheme( 
	0x909090, 0xeeeeee, 0x000000,
	0x999999, 0xffffff, 0x222222,
	0x666666, 3,
	0x808080);

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
	this.state = NODE_EMPTY;
	var mesh = new THREE.Mesh(nodeGeometry,
		this.doban.theme.getNodeMaterial(false,NODE_EMPTY));
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
	getMaterial : function(isHighlighted) {
		return this.doban.theme.getNodeMaterial(isHighlighted,this.state);
	},
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

function Game() {
	this.currentTurn = 0;
	this.history = [];
}

function Doban(ranks,theme) {
	this.nodes = {};
	this.nodelist = [];
	this.ranks = ranks;
	if (theme) {
		this.theme = theme;
	} else {
		this.theme = defaultTheme;
	}
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
	// Create links between nodes
	for (var i = 0; i < this.nodelist.length; i++) {
		this.nodelist[i].resolveDownLinks(this.nodes);
	}
	// Create link lines
	this.linesMesh = new THREE.Line(this.linesGeo,this.theme.lineMat,THREE.LinePieces);
	this.game = new Game();
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
	},
	reset : function() {
		this.game = new Game();
		for (var i = 0; i < this.nodelist.length; i++) {
			this.nodelist[i].state = NODE_EMPTY;
		}
	},
	getTurn : function() { return this.game.currentTurn; },
	playStone : function(node) {
		this.game.history.push(node.index);
		if (this.game.currentTurn % 2 == 0) {
			node.state = NODE_WHITE;
		} else {
			node.state = NODE_BLACK;
		}
		this.game.currentTurn++;
	}
}
