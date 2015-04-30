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

PLAYER_BLACK = 0;
PLAYER_WHITE = 1;

function Move(moveDesc) {
	this.where = moveDesc["where"];
	this.player = moveDesc["player"];
	this.seq = moveDesc["seq"];
	if (moveDesc["captures"]) {
		this.captures=moveDesc["captures"];
	} else {
		this.captures=[];
	}
}

Move.prototype = {
	constructor : Move,
}

function Game(gameDesc) {
	this.id=gameDesc["id"];
	this.players=gameDesc["players"];
	this.moves = [];
	this.whoseTurn = PLAYER_BLACK;
}

Game.prototype = {
	constructor : Game,
	addMove : function(move) {
		// validate?
		this.moves.push(move);
		this.whoseTurn = this.moves.length % 2;
	}
}

function Doban(ranks,theme) {
	this.nodes = {};
	this.nodelist = [];
	this.ranks = ranks;
	this.scene = new THREE.Scene();
	this.pickingScene = new THREE.Scene();

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
	this.game = undefined;
	// Add to scenes
	for (var i = 0; i < this.nodelist.length; i++) {
		this.scene.add(this.nodelist[i].mesh);
		this.pickingScene.add(this.nodelist[i].pickMesh);
	}
	this.scene.add(this.linesMesh);
	// set up renderer
	this.renderer = new THREE.WebGLRenderer();
	this.renderer.sortObjects = false;
	this.camera = undefined;
	this.pickingTexture = undefined;
}

Doban.prototype = {
	constructor : Doban,

	setRenderSize : function(w,h) {
		if (this.camera == undefined) {
			this.camera = new THREE.PerspectiveCamera(75, w/h, 0.1, 10000);
		} else {
			this.camera.aspect = w/h;
			this.camera.updateProjectionMatrix();
		}
		this.renderer.setSize(w,h);
		this.pickingTexture = new THREE.WebGLRenderTarget(w,h);
		this.pickingTexture.generateMipmaps = false;
	},

	reset : function() {
		this.game = undefined;
		for (var i = 0; i < this.nodelist.length; i++) {
			var n = this.nodelist[i];
			n.state = NODE_EMPTY;
			n.mesh.material = n.getMaterial(false);
		}
	},

	getTurn : function() { return this.moves.length + 1; },

	pick : function(x,y) {
		//render the picking scene off-screen
		if (needsPick) {
			this.renderer.setClearColor(0x0000000); // avoid spurious obj hits on bg
			this.renderer.render(this.pickingScene, this.camera, this.pickingTexture);
			needsPick = false;
		} else {
			this.renderer.setRenderTarget(this.pickingTexture);
		}
		var pickCtxt = this.renderer.getContext();
		//read the pixel under the mouse from the texture
		var pixelBuffer = new Uint8Array(4);
		pickCtxt.readPixels(x, y, 1, 1, pickCtxt.RGBA, pickCtxt.UNSIGNED_BYTE, pixelBuffer);
		//interpret the pixel as an ID
		var id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
		if (id != 0) {
			return this.nodelist[id - 1000];
		}
		return null;
	},

	findNode : function(where) {
		for (var i = 0; i < this.nodelist.length; i++) {
			var node = this.nodelist[i];
			if (node.rank == where[0] && 
				node.x == where[1] &&
				node.y == where[2]) {
				return node;
			}
		}
		return undefined;
	},

	playMove : function(move) {
		//alert(JSON.stringify(move));
		var node = this.findNode(move.where);
		this.playStone(node,move.player);
		this.game.addMove(move);
	},

	playStone : function(node,color) {
		if (color == 0) {
			node.state = NODE_BLACK;
		} else {
			node.state = NODE_WHITE;
		}
		node.mesh.material = node.getMaterial(false);
	}
}
