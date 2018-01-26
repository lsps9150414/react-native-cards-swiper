# react-native-card-swiper
Highly customizable Tinder like card swiper for react-native!

## Features
- Cards stretch with the container.
- Controllable current card index.

## Know issues
- RN's Android `overflow: visible` cause card being clipped by container. https://github.com/facebook/react-native/issues/17074
## Roadmap

### TODO


## Props
```
propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.any.isRequired,
    })).isRequired,
    cardIndex: PropTypes.number,

    renderCard: PropTypes.func.isRequired,
    renderSwipedAll: PropTypes.func,

    onSwipeRight: PropTypes.func,
    onSwipeLeft: PropTypes.func,
    onSwipeAll: PropTypes.func,

    swipeThresholdDistanceFactor: PropTypes.number,
    swipeOutDuration: PropTypes.number,
    preloadCards: PropTypes.number,

    containerStyle: ViewPropTypes.style,
};
```

```
defaultProps = {
  data: [],
  cardIndex: undefined,

  renderSwipedAll: undefined,

  onSwipeRight: item => item,
  onSwipeLeft: item => item,
  onSwipeAll: () => null,

  swipeThresholdDistanceFactor: 0.25,
  swipeOutDuration: 150,
  preloadCards: 3,

  containerStyle: undefined,
};
```