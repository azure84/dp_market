function drawMatch(match) {

  var leftNodes = match.consumers.map(function(consumer, index) {
    return { x : -120, y : 10 + 100 * index, r: 20, e: consumer.epsilon, budget: consumer.budget, price: consumer.price };
  });
  var rightNodes = match.providers.map(function(provider, index) {
    return { x: 120, y : 10 + 100 * index, r: 20, e: provider.epsilon, price: provider.price };
  });

  var links = match.consumers.map(function(consumer, index) {
    if (consumer.partner_index != -1) {
      return { source: index, target: consumer.partner_index };
    } else {
      return null;
    }
  }).filter(function(consumer) {
    return consumer;
  })

  var data = {
    leftNodes: leftNodes,
    rightNodes: rightNodes,
    links: links,
  };

  var svg = d3.select($('.chart')[0]).append('svg');

  var links = svg.append('g')
    .attr('transform', 'translate(200, 200)')
    .attr('class', 'links')
    .selectAll('line')
    .data(data.links)
    .enter().append('line')
    .attr('x1', function(d) { return leftNodes[d.source].x; })
    .attr('y1', function(d) { return leftNodes[d.source].y; })
    .attr('x2', function(d) { return rightNodes[d.target].x; })
    .attr('y2', function(d) { return rightNodes[d.target].y; });

  var leftNode = svg.append('g')
    .attr('transform', 'translate(200, 200)')
    .attr('class', 'l-nodes')
    .selectAll('circle')
    .data(data.leftNodes)
    .enter().append('circle')
    .attr('r', function(d) { return d.r; })
    .attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; });

  var rightNode = svg.append('g')
    .attr('transform', 'translate(200, 200)')
    .attr('class', 'r-nodes')
    .selectAll('circle')
    .data(data.rightNodes)
    .enter().append('circle')
    .attr('r', function(d) { return d.r; })
    .attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; });

  var rightNodeText = svg.append('g')
    .attr('transform', 'translate(200, 200)')
    .attr('class', 'r-text')
    .selectAll('text')
    .data(data.rightNodes)
    .enter().append('text')
    .attr('x', function(d) { return d.x; })
    .attr('y', function(d) { return d.y; })
    .append('svg:tspan')
    .attr('x', function(d) { return d.x; })
    .attr('dy', 0)
    .text(function(d) { return 'max_e: ' + d.e; })
    .append('svg:tspan')
    .attr('x', function(d) { return d.x; })
    .attr('dy', 20)
    .text(function(d) { return 'price: ' + d.price; });

  var leftNodeText = svg.append('g')
    .attr('transform', 'translate(200, 200)')
    .attr('class', 'l-text')
    .selectAll('text')
    .data(data.leftNodes)
    .enter().append('text')
    .attr('x', function(d) { return d.x; })
    .attr('y', function(d) { return d.y; })
    .append('svg:tspan')
    .attr('x', function(d) { return d.x; })
    .attr('dy', 0)
    .text(function(d) { return 'min_e: ' + d.e; })
    .append('svg:tspan')
    .attr('x', function(d) { return d.x; })
    .attr('dy', 20)
    .text(function(d) { return 'budget: ' + d.budget; })
    .append('svg:tspan')
    .attr('x', function(d) { return d.x; })
    .attr('dy', 20)
    .text(function(d) { return 'price: ' + d.price; });
}

(function ($) {
  $(document).ready(function() {
    $.ajax({
      url: '/match?api=true',
    }).done(function(res) {
      var match = res.match;
      drawMatch(match);
    })
  });
}(jQuery));
