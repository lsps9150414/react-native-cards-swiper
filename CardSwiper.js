import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewPropTypes,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
  },
  cardContainer: {
    flex: 1,
    position: 'absolute',
  },
  swipedAllContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const propTypes = {
  dataSource: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.any.isRequired,
  })).isRequired,

  renderCard: PropTypes.func.isRequired,
  renderSwipedAll: PropTypes.func,
  cardIndex: PropTypes.number,

  onSwipeRight: PropTypes.func,
  onSwipeLeft: PropTypes.func,
  onSwipeAll: PropTypes.func,

  swipeThresholdDistanceFactor: PropTypes.number,
  swipeOutDuration: PropTypes.number,
  preloadCards: PropTypes.number,

  containerStyle: ViewPropTypes.style,
};

const defaultProps = {
  renderSwipedAll: undefined,
  cardIndex: 0,

  onSwipeRight: () => { },
  onSwipeLeft: () => { },
  onSwipeAll: () => { },

  swipeThresholdDistanceFactor: 0.25,
  swipeOutDuration: 150,
  preloadCards: 3,

  containerStyle: {},
};

class CardSwiper extends Component {
  constructor(props) {
    super(props);
    this.position = new Animated.ValueXY();
    this.containerLayout = {};
    this.cardLayout = {};
    this.panResponder = {};

    this.state = {
      currentCardIndex: props.cardIndex,
    };
  }

  componentWillReceiveProps(nextProps) {
    this.handleReceiveNewDataSource(nextProps);
    this.handleReceiveNewCardIndex(nextProps);
  }

  handleReceiveNewDataSource = (nextProps) => {
    if (!_.isEqual(nextProps.dataSource, this.props.dataSource)) {
      this.setState({ currentCardIndex: nextProps.cardIndex });
    }
  }
  
  handleReceiveNewCardIndex = (nextProps) => {
    if (nextProps.cardIndex !== this.state.currentCardIndex) {
      this.setState({ currentCardIndex: nextProps.cardIndex });
    }
  }

  initPanResponder(position) {
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        const { swipeThresholdDistanceFactor } = this.props;
        const { containerLayout } = this;
        // TODO: add swipeThresholdSpeedFactor
        if (gesture.dx > swipeThresholdDistanceFactor * containerLayout.width) {
          this.forceSwipe('right');
        } else if (gesture.dx < -swipeThresholdDistanceFactor * containerLayout.width) {
          this.forceSwipe('left');
        } else {
          this.resetCardPosition();
        }
      },
    });
  }

  swipeRight() {
    this.forceSwipe('right');
  }

  swipeLeft() {
    this.forceSwipe('left');
  }

  forceSwipe(direction) {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(this.position, {
      toValue: { x, y: 0 },
      duration: this.props.swipeOutDuration,
    }).start(() => this.handleSwipeComplete(direction));
  }

  handleSwipeComplete(direction) {
    const { onSwipeLeft, onSwipeRight, dataSource } = this.props;
    const item = dataSource[this.state.currentCardIndex];

    this.position.setValue({ x: 0, y: 0 });
    this.setState({ currentCardIndex: this.state.currentCardIndex + 1 }, () => {
      switch (direction) {
        case 'right':
          onSwipeRight(item);
          break;
        case 'left':
          onSwipeLeft(item);
          break;
        default:
      }
    });
  }

  resetCardPosition() {
    Animated.spring(this.position, {
      toValue: { x: 0, y: 0 },
    }).start();
  }

  updateContainerLayout = ({ nativeEvent }) => {
    if (
      this.containerLayout.height !== nativeEvent.layout.height &&
      this.containerLayout.width !== nativeEvent.layout.width
    ) {
      this.containerLayout = nativeEvent.layout;
      this.initPanResponder(this.position);
    }
  }

  getCardLayoutStyles() {
    const containerStyle = StyleSheet.flatten(this.props.containerStyle);

    // const containerBorderTopWidth = containerStyle.borderTopWidth || containerStyle.borderWidth || 0;
    // const containerBorderBottomWidth = containerStyle.borderBottomWidth || containerStyle.borderWidth || 0;
    // const containerVerticalBorderWidth = containerBorderTopWidth + containerBorderBottomWidth;

    const containerBorderLeftWidth = containerStyle.borderLeftWidth || containerStyle.borderWidth || 0;
    const containerBorderRightWidth = containerStyle.borderRightWidth || containerStyle.borderWidth || 0;
    const containerHorizontalBorderWidth = containerBorderLeftWidth + containerBorderRightWidth;

    const containerPaddingTop = containerStyle.paddingTop || containerStyle.padding || 0;

    const containerPaddingLeft = containerStyle.paddingLeft || containerStyle.padding || 0;
    const containerPaddingRight = containerStyle.paddingRight || containerStyle.padding || 0;
    const containerHorizontalPadding = containerPaddingLeft + containerPaddingRight;

    const widthOffset = containerHorizontalBorderWidth + containerHorizontalPadding;

    return ({
      width: this.containerLayout.width - widthOffset,
      marginTop: containerPaddingTop,
      marginLeft: containerPaddingLeft,
    });
  }

  getCardAnimatedStyles() {
    // TODO: make this basing on both position.x and position.y
    const rotate = this.position.x.interpolate({
      // TODO: make this a props
      inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      outputRange: ['-30deg', '0deg', '30deg'],
    });
    
    return ({
      ...this.position.getLayout(),
      transform: [{ rotate }],
    });
  }
  
  getBackgroundCardAnimatedStyles(i) {
    if (i === this.state.currentCardIndex + 1) {
      // TODO: make this basing on both position.x and position.y
      const scale = this.position.x.interpolate({
        // TODO: make this a props
        inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        outputRange: [1, 0.95, 1],
      });
      return ({ transform: [{ scale }] });
    }
    return ({ opacity: 0 });
  }

  renderSwipedAll = () => (this.props.renderSwipedAll ? this.props.renderSwipedAll() : (
    <View style={styles.swipedAllContainer}>
      <Text>No more cards</Text>
    </View>
  ))

  renderCards() {
    if (this.state.currentCardIndex >= this.props.dataSource.length) {
      this.props.onSwipeAll();
      return this.renderSwipedAll();
    }

    return this.props.dataSource.map((item, i) => {
      if (i < this.state.currentCardIndex) {
        return null;
      } else if (i === this.state.currentCardIndex) {
        return (
          <Animated.View
            key={`react-native-card-swiper-card-${i}`} // eslint-disable-line react/no-array-index-key
            style={[
              styles.cardContainer,
              this.getCardLayoutStyles(),
              this.getCardAnimatedStyles(),
              { zIndex: 99 },
            ]}
            {...this.panResponder.panHandlers}
          >
            {this.props.renderCard(item)}
          </Animated.View>
        );
      } else if (i < this.state.currentCardIndex + this.props.preloadCards) {
        return (
          <Animated.View
            key={`react-native-card-swiper-card-${i}`} // eslint-disable-line react/no-array-index-key
            style={[
              styles.cardContainer,
              this.getCardLayoutStyles(),
              this.getBackgroundCardAnimatedStyles(i),
            ]}
          >
            {this.props.renderCard(item)}
          </Animated.View>
        );
      }
      return null;
    }).reverse();
  }

  render() {
    return (
      <View
        onLayout={this.updateContainerLayout}
        style={[
          styles.container,
          this.props.containerStyle,
        ]}
      >
        {this.renderCards()}
      </View>
    );
  }
}

CardSwiper.propTypes = propTypes;
CardSwiper.defaultProps = defaultProps;

export default CardSwiper;
