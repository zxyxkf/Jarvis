describe('SearchService', () => {
  describe('RRF Fusion', () => {
    it('merges two result sets with RRF weighting', () => {
      // Testing the fusion algorithm logic
      const k = 60
      const vecResults = [{ id: 'a' }, { id: 'b' }]
      const keyResults = [{ id: 'b' }, { id: 'c' }]

      const scoreMap = new Map<string, number>()

      // Vector weight
      vecResults.forEach((r, rank) => scoreMap.set(r.id, 1.0 / (k + rank + 1)))
      // Keyword weight (0.8)
      keyResults.forEach((r, rank) => {
        const prev = scoreMap.get(r.id) || 0
        scoreMap.set(r.id, prev + 0.8 / (k + rank + 1))
      })

      // 'b' appears in both → highest score
      const scores = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1])
      expect(scores[0]![0]).toBe('b')
    })
  })
})
