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

function Doban(ranks) {
	this.nodes = {};
	this.nodelist = [];
	this.ranks = ranks;
	var wx = 1;
	var wy = 1;
	var doban = this;
	function buildRank(rank,wx,wy) {
		var xoff = -wx+1;
		var yoff = -wy+1;
		for (var x = 0; x < wx; x++) {
			for (var y = 0; y < wy; y++) {
				var node = new Node(rank,xoff+2*x,yoff+2*y);
				doban.nodes[ node.key ] = node;
				doban.nodelist.push(node);
			}
		}
	}

	for (var i = 0; i < ranks; i++) {
		buildRank(i,wx,wy);
		var inc = 1;
		if (i >= Math.ceil(ranks/2)) {
			inc = -1; 
		}
		if (i % 2 == 1) {
			wx += inc;
		} else {
			wy += inc;
		}
	}
	for (var i = 0; i < this.nodelist.length; i++) {
		this.nodelist[i].resolveDownLinks(this.nodes);
	}
}

Doban.prototype = {
	constructor : Doban
}
